/**
 * Clients API - Managing client relationships and customer data
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

// === TYPE DEFINITIONS ===

export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  customer_type: 'new' | 'returning' | 'vip' | 'at_risk'
  total_visits: number
  total_spent: number
  average_ticket: number
  last_visit_date?: string
  visit_frequency_days?: number
  no_show_count: number
  cancellation_count: number
  referral_count: number
  tags: string[]
  notes?: string
  sms_enabled: boolean
  email_enabled: boolean
  marketing_enabled: boolean
  created_at: string
  favorite_service?: string
}

export interface ClientStats {
  total_clients: number
  new_clients: number
  returning_clients: number
  vip_clients: number
  at_risk_clients: number
  average_ticket: number
  total_revenue: number
  client_retention_rate: number
  average_visits_per_client: number
  top_clients: Array<{
    id: number
    name: string
    total_spent: number
    total_visits: number
    customer_type: string
  }>
}

export interface ClientHistory {
  appointments: Array<{
    id: number
    date: string
    time?: string
    service: string
    barber: string
    cost: number
    status: string
    notes?: string
  }>
  total_appointments: number
  total_spent: number
  services_breakdown: Record<string, number>
  average_rating?: number
  last_review?: {
    rating: number
    comment: string
    date: string
  }
}

export interface ClientFilter {
  search?: string
  customer_type?: string
  barber_id?: number
  sort_by?: 'last_visit' | 'total_spent' | 'total_visits' | 'created_at'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CreateClientRequest {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth?: string
  notes?: string
  tags?: string[]
  sms_enabled?: boolean
  email_enabled?: boolean
  marketing_enabled?: boolean
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

export interface ClientMessage {
  subject: string
  message: string
  send_email?: boolean
  send_sms?: boolean
}

// === CLIENTS API ===

export const clientsService = {
  // === CLIENT CRUD ===

  /**
   * Get list of clients with filtering and pagination
   */
  async getClients(filters?: ClientFilter): Promise<PaginatedResponse<Client>> {
    const params = new URLSearchParams()

    if (filters?.search) params.append('search', filters.search)
    if (filters?.customer_type) params.append('customer_type', filters.customer_type)
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.sort_by) params.append('sort_by', filters.sort_by)
    if (filters?.order) params.append('order', filters.order)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const response = await apiClient.get<{
      clients: Client[]
      total_clients: number
      total_pages: number
      current_page: number
      has_next: boolean
      has_prev: boolean
    }>(`/clients?${params.toString()}`)

    return {
      data: response.data.clients,
      total: response.data.total_clients,
      page: response.data.current_page,
      totalPages: response.data.total_pages,
      hasNext: response.data.has_next,
      hasPrev: response.data.has_prev
    }
  },

  /**
   * Get client by ID
   */
  async getClient(clientId: number): Promise<ApiResponse<Client>> {
    const response = await apiClient.get<Client>(`/clients/${clientId}`)
    return { data: response.data }
  },

  /**
   * Create new client
   */
  async createClient(data: CreateClientRequest): Promise<ApiResponse<Client>> {
    const response = await apiClient.post<Client>('/clients', data)
    return { data: response.data }
  },

  /**
   * Update client
   */
  async updateClient(clientId: number, data: UpdateClientRequest): Promise<ApiResponse<Client>> {
    const response = await apiClient.put<Client>(`/clients/${clientId}`, data)
    return { data: response.data }
  },

  /**
   * Delete client
   */
  async deleteClient(clientId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/clients/${clientId}`)
    return { data: response.data }
  },

  // === CLIENT HISTORY ===

  /**
   * Get client appointment history
   */
  async getClientHistory(clientId: number): Promise<ApiResponse<ClientHistory>> {
    const response = await apiClient.get<ClientHistory>(`/clients/${clientId}/history`)
    return { data: response.data }
  },

  // === CLIENT COMMUNICATION ===

  /**
   * Send message to client
   */
  async sendClientMessage(clientId: number, message: ClientMessage): Promise<ApiResponse<{
    message: string
    client_id: number
    email_sent: boolean
    sms_sent: boolean
  }>> {
    const response = await apiClient.post(`/clients/${clientId}/message`, message)
    return { data: response.data }
  },

  /**
   * Update VIP status
   */
  async updateVipStatus(clientId: number, isVip: boolean, customRate?: number, benefits?: any): Promise<ApiResponse<{
    message: string
    client_id: number
    is_vip: boolean
  }>> {
    const response = await apiClient.post(`/clients/${clientId}/vip-status`, {
      is_vip: isVip,
      custom_rate: customRate,
      vip_benefits: benefits
    })
    return { data: response.data }
  },

  // === STATISTICS ===

  /**
   * Get client statistics
   */
  async getClientStats(
    startDate?: string,
    endDate?: string,
    barberId?: number
  ): Promise<ApiResponse<ClientStats>> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get<ClientStats>(`/clients/stats?${params.toString()}`)
    return { data: response.data }
  },

  // === EXPORT ===

  /**
   * Export clients data
   */
  async exportClients(format: 'csv' | 'json' = 'csv', customerType?: string): Promise<Blob | any> {
    const params = new URLSearchParams()
    params.append('format', format)
    if (customerType) params.append('customer_type', customerType)

    if (format === 'csv') {
      const response = await apiClient.get(`/clients/export?${params.toString()}`, {
        responseType: 'blob'
      })
      return response.data
    } else {
      const response = await apiClient.get(`/clients/export?${params.toString()}`)
      return response.data
    }
  },

  // === UTILITY METHODS ===

  /**
   * Get client full name
   */
  getClientFullName(client: Client): string {
    return `${client.first_name} ${client.last_name}`
  },

  /**
   * Get client status display
   */
  getClientStatusDisplay(client: Client): {
    label: string
    color: string
    bgColor: string
  } {
    switch (client.customer_type) {
      case 'new':
        return {
          label: 'New Client',
          color: '#059669',
          bgColor: '#ecfdf5'
        }
      case 'returning':
        return {
          label: 'Returning',
          color: '#0d9488',
          bgColor: '#f0fdfa'
        }
      case 'vip':
        return {
          label: 'VIP',
          color: '#7c3aed',
          bgColor: '#f3e8ff'
        }
      case 'at_risk':
        return {
          label: 'At Risk',
          color: '#dc2626',
          bgColor: '#fef2f2'
        }
      default:
        return {
          label: 'Unknown',
          color: '#6b7280',
          bgColor: '#f9fafb'
        }
    }
  },

  /**
   * Calculate client value score
   */
  getClientValueScore(client: Client): {
    score: number
    level: 'Low' | 'Medium' | 'High' | 'Excellent'
    color: string
  } {
    // Calculate score based on total spent, visits, and frequency
    let score = 0

    // Points for spending (max 40 points)
    if (client.total_spent > 1000) score += 40
    else if (client.total_spent > 500) score += 30
    else if (client.total_spent > 200) score += 20
    else if (client.total_spent > 50) score += 10

    // Points for visit frequency (max 30 points)
    if (client.total_visits > 20) score += 30
    else if (client.total_visits > 10) score += 25
    else if (client.total_visits > 5) score += 20
    else if (client.total_visits > 2) score += 15
    else if (client.total_visits > 0) score += 10

    // Points for engagement (max 20 points)
    const noShowRate = client.no_show_count / (client.total_visits || 1)
    if (noShowRate < 0.1) score += 20
    else if (noShowRate < 0.2) score += 15
    else if (noShowRate < 0.3) score += 10
    else score += 5

    // Points for referrals (max 10 points)
    score += Math.min(client.referral_count * 2, 10)

    if (score >= 80) {
      return { score, level: 'Excellent', color: '#059669' }
    } else if (score >= 60) {
      return { score, level: 'High', color: '#0d9488' }
    } else if (score >= 40) {
      return { score, level: 'Medium', color: '#d97706' }
    } else {
      return { score, level: 'Low', color: '#dc2626' }
    }
  },

  /**
   * Format last visit date
   */
  formatLastVisit(client: Client): string {
    if (!client.last_visit_date) return 'Never'

    const lastVisit = new Date(client.last_visit_date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  },

  /**
   * Get client communication preferences
   */
  getClientCommunicationMethods(client: Client): string[] {
    const methods = []
    if (client.email_enabled) methods.push('Email')
    if (client.sms_enabled) methods.push('SMS')
    return methods
  },

  /**
   * Validate client data
   */
  validateClientData(data: CreateClientRequest | UpdateClientRequest): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if ('first_name' in data && !data.first_name?.trim()) {
      errors.push('First name is required')
    }

    if ('last_name' in data && !data.last_name?.trim()) {
      errors.push('Last name is required')
    }

    if ('email' in data) {
      if (!data.email?.trim()) {
        errors.push('Email is required')
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.email)) {
          errors.push('Invalid email format')
        }
      }
    }

    if ('phone' in data) {
      if (!data.phone?.trim()) {
        errors.push('Phone number is required')
      } else {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/
        if (!phoneRegex.test(data.phone)) {
          errors.push('Invalid phone number format')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
