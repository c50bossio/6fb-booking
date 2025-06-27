/**
 * POS API - Point of Sale endpoints for product sales and commission tracking
 */

import apiClient from './client'
import type { ApiResponse } from './client'

// === TYPE DEFINITIONS ===

export interface POSSale {
  id: number
  barber_id: number
  barber_name: string
  items: POSSaleItem[]
  subtotal: number
  tax: number
  total: number
  payment_method: 'card' | 'cash' | 'other'
  payment_details?: any
  customer_email?: string
  customer_phone?: string
  commission_total: number
  status: 'completed' | 'refunded' | 'partial_refund'
  created_at: string
  updated_at: string
}

export interface POSSaleItem {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  commission_rate: number
  commission_amount: number
}

export interface CreateSaleRequest {
  barber_id: number
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    commission_rate: number
  }>
  subtotal: number
  tax: number
  total: number
  payment_method: 'card' | 'cash' | 'other'
  payment_details?: any
  customer_email?: string
  customer_phone?: string
}

export interface SalesReport {
  barber_id: number
  period_start: string
  period_end: string
  total_sales: number
  total_revenue: number
  total_commission: number
  sales_count: number
  average_sale: number
  top_products: Array<{
    product_id: number
    product_name: string
    quantity_sold: number
    revenue: number
    commission: number
  }>
  daily_breakdown: Array<{
    date: string
    sales_count: number
    revenue: number
    commission: number
  }>
}

export interface BarberPINAuthRequest {
  barber_id: number
  pin: string
  device_info?: string
}

export interface BarberPINAuthResponse {
  success: boolean
  session_token?: string
  expires_at?: string
  message?: string
}

// === POS API SERVICE ===

export const posService = {
  // === AUTHENTICATION ===

  /**
   * Authenticate barber with PIN
   */
  async authenticateBarber(data: BarberPINAuthRequest): Promise<ApiResponse<BarberPINAuthResponse>> {
    const response = await apiClient.post<BarberPINAuthResponse>('/barber-pin/authenticate', data)
    return { data: response.data }
  },

  /**
   * Validate POS session
   */
  async validateSession(sessionToken: string): Promise<ApiResponse<{ valid: boolean; barber_id?: number }>> {
    const response = await apiClient.post('/barber-pin/validate-session', {
      session_token: sessionToken
    })
    return { data: response.data }
  },

  /**
   * Logout from POS session
   */
  async logout(sessionToken: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post('/barber-pin/logout', {
      session_token: sessionToken
    })
    return { data: response.data }
  },

  // === SALES ===

  /**
   * Create a new sale
   */
  async createSale(data: CreateSaleRequest): Promise<ApiResponse<POSSale>> {
    const response = await apiClient.post<POSSale>('/sales', data)
    return { data: response.data }
  },

  /**
   * Get sale by ID
   */
  async getSale(saleId: number): Promise<ApiResponse<POSSale>> {
    const response = await apiClient.get<POSSale>(`/sales/${saleId}`)
    return { data: response.data }
  },

  /**
   * Get sales for a barber
   */
  async getBarberSales(
    barberId: number,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{ items: POSSale[]; total: number; page: number; pages: number }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const response = await apiClient.get(`/barbers/${barberId}/sales?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Process refund
   */
  async refundSale(
    saleId: number,
    items?: Array<{ item_id: number; quantity: number }>,
    reason?: string
  ): Promise<ApiResponse<POSSale>> {
    const response = await apiClient.post<POSSale>(`/sales/${saleId}/refund`, {
      items,
      reason,
      partial: !!items
    })
    return { data: response.data }
  },

  // === REPORTING ===

  /**
   * Get sales report for barber
   */
  async getSalesReport(
    barberId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<SalesReport>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })

    const response = await apiClient.get<SalesReport>(`/barbers/${barberId}/sales-report?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get daily sales summary
   */
  async getDailySummary(date?: string): Promise<ApiResponse<{
    date: string
    total_sales: number
    total_revenue: number
    total_commission: number
    barber_breakdown: Array<{
      barber_id: number
      barber_name: string
      sales_count: number
      revenue: number
      commission: number
    }>
  }>> {
    const params = date ? `?date=${date}` : ''
    const response = await apiClient.get(`/sales/daily-summary${params}`)
    return { data: response.data }
  },

  // === RECEIPTS ===

  /**
   * Send receipt via email
   */
  async emailReceipt(saleId: number, email: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(`/sales/${saleId}/receipt/email`, { email })
    return { data: response.data }
  },

  /**
   * Send receipt via SMS
   */
  async smsReceipt(saleId: number, phone: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(`/sales/${saleId}/receipt/sms`, { phone })
    return { data: response.data }
  },

  /**
   * Get receipt data for printing
   */
  async getReceiptData(saleId: number): Promise<ApiResponse<{
    sale: POSSale
    shop_info: {
      name: string
      address: string
      phone: string
      email: string
    }
    receipt_number: string
    formatted_date: string
  }>> {
    const response = await apiClient.get(`/sales/${saleId}/receipt`)
    return { data: response.data }
  },

  // === COMMISSION TRACKING ===

  /**
   * Get pending commissions for barber
   */
  async getPendingCommissions(barberId: number): Promise<ApiResponse<{
    total_pending: number
    next_payout_date: string
    sales: Array<{
      sale_id: number
      date: string
      commission_amount: number
      status: 'pending' | 'processing' | 'paid'
    }>
  }>> {
    const response = await apiClient.get(`/barbers/${barberId}/commissions/pending`)
    return { data: response.data }
  },

  /**
   * Get commission history
   */
  async getCommissionHistory(
    barberId: number,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{
    items: Array<{
      id: number
      date: string
      amount: number
      sales_count: number
      status: 'pending' | 'processing' | 'paid'
      payout_id?: number
      paid_at?: string
    }>
    total: number
    page: number
    pages: number
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    const response = await apiClient.get(`/barbers/${barberId}/commissions/history?${params.toString()}`)
    return { data: response.data }
  }
}
