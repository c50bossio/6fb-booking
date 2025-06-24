/**
 * Clients API - Managing client relationships and customer data
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

// Demo mode configuration
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// === MOCK DATA FOR DEMO MODE ===

const MOCK_CLIENTS: Client[] = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    customer_type: 'vip',
    total_visits: 24,
    total_spent: 2400.00,
    average_ticket: 100.00,
    last_visit_date: '2024-06-20',
    visit_frequency_days: 14,
    no_show_count: 0,
    cancellation_count: 1,
    referral_count: 3,
    tags: ['VIP Client', 'Regular'],
    notes: 'Prefers morning appointments. Always tips well.',
    sms_enabled: true,
    email_enabled: true,
    marketing_enabled: true,
    created_at: '2023-01-15T00:00:00Z',
    favorite_service: 'Premium Cut & Style'
  },
  {
    id: 2,
    first_name: 'Mike',
    last_name: 'Johnson',
    email: 'mike.johnson@email.com',
    phone: '+1 (555) 234-5678',
    customer_type: 'returning',
    total_visits: 12,
    total_spent: 1080.00,
    average_ticket: 90.00,
    last_visit_date: '2024-06-18',
    visit_frequency_days: 21,
    no_show_count: 1,
    cancellation_count: 0,
    referral_count: 1,
    tags: ['Regular', 'Beard Trim'],
    notes: 'Likes to chat about sports. Prefers weekend appointments.',
    sms_enabled: true,
    email_enabled: false,
    marketing_enabled: true,
    created_at: '2023-03-22T00:00:00Z',
    favorite_service: 'Cut & Beard Trim'
  },
  {
    id: 3,
    first_name: 'David',
    last_name: 'Wilson',
    email: 'david.wilson@email.com',
    phone: '+1 (555) 345-6789',
    customer_type: 'new',
    total_visits: 3,
    total_spent: 225.00,
    average_ticket: 75.00,
    last_visit_date: '2024-06-15',
    visit_frequency_days: 30,
    no_show_count: 0,
    cancellation_count: 0,
    referral_count: 0,
    tags: ['New Client'],
    notes: 'First-time client. Interested in styling services.',
    sms_enabled: true,
    email_enabled: true,
    marketing_enabled: false,
    created_at: '2024-05-10T00:00:00Z',
    favorite_service: 'Basic Cut'
  },
  {
    id: 4,
    first_name: 'Alex',
    last_name: 'Rodriguez',
    email: 'alex.rodriguez@email.com',
    phone: '+1 (555) 456-7890',
    customer_type: 'at_risk',
    total_visits: 18,
    total_spent: 1620.00,
    average_ticket: 90.00,
    last_visit_date: '2024-04-15',
    visit_frequency_days: 28,
    no_show_count: 3,
    cancellation_count: 2,
    referral_count: 0,
    tags: ['At Risk', 'Needs Follow-up'],
    notes: 'Has been canceling recently. May need retention outreach.',
    sms_enabled: false,
    email_enabled: true,
    marketing_enabled: true,
    created_at: '2023-02-08T00:00:00Z',
    favorite_service: 'Premium Cut'
  },
  {
    id: 5,
    first_name: 'Sarah',
    last_name: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 567-8901',
    customer_type: 'vip',
    total_visits: 36,
    total_spent: 4320.00,
    average_ticket: 120.00,
    last_visit_date: '2024-06-22',
    visit_frequency_days: 10,
    no_show_count: 0,
    cancellation_count: 0,
    referral_count: 5,
    tags: ['VIP Client', 'High Value', 'Referrer'],
    notes: 'Top client. Books monthly styling appointments.',
    sms_enabled: true,
    email_enabled: true,
    marketing_enabled: true,
    created_at: '2022-12-01T00:00:00Z',
    favorite_service: 'Full Service Package'
  },
  {
    id: 6,
    first_name: 'Robert',
    last_name: 'Thompson',
    email: 'robert.thompson@email.com',
    phone: '+1 (555) 678-9012',
    customer_type: 'returning',
    total_visits: 8,
    total_spent: 600.00,
    average_ticket: 75.00,
    last_visit_date: '2024-06-10',
    visit_frequency_days: 35,
    no_show_count: 0,
    cancellation_count: 1,
    referral_count: 1,
    tags: ['Regular', 'Punctual'],
    notes: 'Always on time. Prefers quiet service.',
    sms_enabled: true,
    email_enabled: true,
    marketing_enabled: false,
    created_at: '2023-08-15T00:00:00Z',
    favorite_service: 'Classic Cut'
  }
]

const MOCK_CLIENT_STATS: ClientStats = {
  total_clients: 12,
  new_clients: 3,
  returning_clients: 7,
  vip_clients: 2,
  at_risk_clients: 1,
  average_ticket: 95.50,
  total_revenue: 12840.00,
  client_retention_rate: 85.5,
  average_visits_per_client: 16.8,
  top_clients: [
    {
      id: 5,
      name: 'Sarah Chen',
      total_spent: 4320.00,
      total_visits: 36,
      customer_type: 'vip'
    },
    {
      id: 1,
      name: 'John Smith',
      total_spent: 2400.00,
      total_visits: 24,
      customer_type: 'vip'
    },
    {
      id: 4,
      name: 'Alex Rodriguez',
      total_spent: 1620.00,
      total_visits: 18,
      customer_type: 'at_risk'
    }
  ]
}

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
    // Return mock data in demo mode
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock client data')

      let filteredClients = [...MOCK_CLIENTS]

      // Apply filters to mock data
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        filteredClients = filteredClients.filter(client =>
          `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchLower) ||
          client.email.toLowerCase().includes(searchLower) ||
          client.phone.includes(filters.search!)
        )
      }

      if (filters?.customer_type) {
        filteredClients = filteredClients.filter(client =>
          client.customer_type === filters.customer_type
        )
      }

      // Apply sorting
      if (filters?.sort_by) {
        filteredClients.sort((a, b) => {
          let aVal: any, bVal: any

          switch (filters.sort_by) {
            case 'last_visit':
              aVal = new Date(a.last_visit_date || '1970-01-01').getTime()
              bVal = new Date(b.last_visit_date || '1970-01-01').getTime()
              break
            case 'total_spent':
              aVal = a.total_spent
              bVal = b.total_spent
              break
            case 'total_visits':
              aVal = a.total_visits
              bVal = b.total_visits
              break
            default:
              aVal = `${a.first_name} ${a.last_name}`
              bVal = `${b.first_name} ${b.last_name}`
          }

          if (filters.order === 'desc') {
            return bVal > aVal ? 1 : -1
          }
          return aVal > bVal ? 1 : -1
        })
      }

      // Apply pagination
      const page = filters?.page || 1
      const limit = filters?.limit || 20
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedClients = filteredClients.slice(startIndex, endIndex)

      return {
        data: paginatedClients,
        total: filteredClients.length,
        page: page,
        totalPages: Math.ceil(filteredClients.length / limit),
        hasNext: endIndex < filteredClients.length,
        hasPrev: page > 1
      }
    }

    // Real API call for production
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
    // Return mock data in demo mode
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock client data for ID:', clientId)
      const client = MOCK_CLIENTS.find(c => c.id === clientId)
      if (!client) {
        throw new Error(`Client with ID ${clientId} not found`)
      }
      return { data: client }
    }

    // Real API call for production
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
    // Return mock data in demo mode
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock client stats')
      return { data: MOCK_CLIENT_STATS }
    }

    // Real API call for production
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get<ClientStats>(`/clients/stats?${params.toString()}`)
    return { data: response.data }
  },

  // === UTILITY FUNCTIONS ===

  /**
   * Calculate client value score (0-100 scale)
   */
  getClientValueScore(client: Client): {
    score: number
    level: 'Low' | 'Medium' | 'High' | 'Excellent'
    color: string
  } {
    // Calculate score based on multiple factors
    let score = 0

    // Total spent weight (40% of score)
    const spentScore = Math.min((client.total_spent / 5000) * 40, 40)
    score += spentScore

    // Visit frequency weight (30% of score)
    const visitScore = Math.min((client.total_visits / 50) * 30, 30)
    score += visitScore

    // Referral bonus (15% of score)
    const referralScore = Math.min((client.referral_count / 5) * 15, 15)
    score += referralScore

    // Reliability factor (15% of score)
    const reliabilityScore = 15 - (client.no_show_count * 3) - (client.cancellation_count * 2)
    score += Math.max(reliabilityScore, 0)

    // Round to nearest integer
    score = Math.round(Math.max(0, Math.min(100, score)))

    // Determine level and color
    let level: 'Low' | 'Medium' | 'High' | 'Excellent'
    let color: string

    if (score >= 80) {
      level = 'Excellent'
      color = 'text-green-600 bg-green-100'
    } else if (score >= 60) {
      level = 'High'
      color = 'text-blue-600 bg-blue-100'
    } else if (score >= 40) {
      level = 'Medium'
      color = 'text-yellow-600 bg-yellow-100'
    } else {
      level = 'Low'
      color = 'text-red-600 bg-red-100'
    }

    return { score, level, color }
  },

  /**
   * Get customer type display info
   */
  getCustomerTypeInfo(customerType: Client['customer_type']): {
    label: string
    color: string
    description: string
  } {
    switch (customerType) {
      case 'vip':
        return {
          label: 'VIP',
          color: 'text-purple-600 bg-purple-100',
          description: 'High-value client with excellent loyalty'
        }
      case 'returning':
        return {
          label: 'Returning',
          color: 'text-blue-600 bg-blue-100',
          description: 'Regular client with good visit history'
        }
      case 'new':
        return {
          label: 'New',
          color: 'text-green-600 bg-green-100',
          description: 'Recently acquired client'
        }
      case 'at_risk':
        return {
          label: 'At Risk',
          color: 'text-red-600 bg-red-100',
          description: 'Client showing signs of declining engagement'
        }
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-600 bg-gray-100',
          description: 'Status not determined'
        }
    }
  },

  /**
   * Format client name
   */
  getClientFullName(client: Client): string {
    return `${client.first_name} ${client.last_name}`.trim()
  },

  /**
   * Calculate days since last visit
   */
  getDaysSinceLastVisit(client: Client): number | null {
    if (!client.last_visit_date) return null

    const lastVisit = new Date(client.last_visit_date)
    const today = new Date()
    const diffTime = today.getTime() - lastVisit.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  },

  /**
   * Get next expected visit date
   */
  getNextExpectedVisit(client: Client): Date | null {
    if (!client.last_visit_date || !client.visit_frequency_days) return null

    const lastVisit = new Date(client.last_visit_date)
    const nextVisit = new Date(lastVisit)
    nextVisit.setDate(lastVisit.getDate() + client.visit_frequency_days)

    return nextVisit
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
