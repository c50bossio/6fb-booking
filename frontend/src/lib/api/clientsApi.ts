import apiClient, { ApiResponse, PaginatedResponse } from './client'

// Types
export interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth?: string
  total_visits: number
  total_spent: number
  last_visit_date: string | null
  customer_type: string
  favorite_service?: string
  average_ticket: number
  visit_frequency_days: number | null
  notes?: string
  tags?: string[]
  no_show_count: number
  cancellation_count: number
  referral_count: number
  sms_enabled: boolean
  email_enabled: boolean
  marketing_enabled: boolean
  created_at: string
  barber_id?: number
}

export interface ClientCreate {
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

export interface ClientUpdate extends Partial<ClientCreate> {}

export interface ClientListResponse {
  clients: Client[]
  total_clients: number
  total_pages: number
  current_page: number
  has_next: boolean
  has_prev: boolean
}

export interface ClientHistory {
  appointments: {
    id: string
    date: string
    time: string
    service: string
    barber: string
    cost: number
    status: string
    notes?: string
  }[]
  total_appointments: number
  total_spent: number
  services_breakdown: { [key: string]: number }
  average_rating?: number
  last_review?: {
    rating: number
    comment: string
    date: string
  }
}

export interface VIPStatusUpdate {
  is_vip: boolean
  custom_rate?: number
  vip_benefits?: {
    priority_booking?: boolean
    discount_percentage?: number
    free_beard_trim?: boolean
  }
}

export interface ClientMessage {
  subject: string
  message: string
  send_email?: boolean
  send_sms?: boolean
}

// API Functions
export const clientsApi = {
  // Get all clients with pagination and filtering
  getClients: async (params?: {
    page?: number
    limit?: number
    search?: string
    customer_type?: string
    barber_id?: number
    sort_by?: 'last_visit' | 'total_spent' | 'total_visits' | 'created_at'
    order?: 'asc' | 'desc'
  }): Promise<ClientListResponse> => {
    const response = await apiClient.get<ClientListResponse>('/clients', { params })
    return response.data
  },

  // Get a single client by ID
  getClient: async (clientId: string): Promise<Client> => {
    const response = await apiClient.get<Client>(`/clients/${clientId}`)
    return response.data
  },

  // Create a new client
  createClient: async (data: ClientCreate): Promise<Client> => {
    const response = await apiClient.post<Client>('/clients', data)
    return response.data
  },

  // Update a client
  updateClient: async (clientId: string, data: ClientUpdate): Promise<Client> => {
    const response = await apiClient.put<Client>(`/clients/${clientId}`, data)
    return response.data
  },

  // Delete a client (admin only)
  deleteClient: async (clientId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/clients/${clientId}`)
    return response.data
  },

  // Get client appointment history
  getClientHistory: async (clientId: string): Promise<ClientHistory> => {
    const response = await apiClient.get<ClientHistory>(`/clients/${clientId}/history`)
    return response.data
  },

  // Update client VIP status
  updateVIPStatus: async (clientId: string, data: VIPStatusUpdate): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/clients/${clientId}/vip-status`, data)
    return response.data
  },

  // Send message to client
  sendMessage: async (clientId: string, data: ClientMessage): Promise<{
    message: string
    email_sent?: boolean
    sms_sent?: boolean
  }> => {
    const response = await apiClient.post<{
      message: string
      email_sent?: boolean
      sms_sent?: boolean
    }>(`/clients/${clientId}/message`, data)
    return response.data
  },

  // Export clients
  exportClients: async (params?: {
    format?: 'csv' | 'json'
    customer_type?: string
  }): Promise<Blob | { clients: Client[], total: number }> => {
    const response = await apiClient.post('/clients/export', {}, {
      params,
      responseType: params?.format === 'csv' ? 'blob' : 'json'
    })
    return response.data
  },

  // Search clients by name, email or phone
  searchClients: async (query: string): Promise<Client[]> => {
    const response = await apiClient.get<ClientListResponse>('/clients', {
      params: { search: query, limit: 10 }
    })
    return response.data.clients
  },

  // Get client stats
  getClientStats: async (): Promise<{
    total_clients: number
    new_clients_this_month: number
    vip_clients: number
    at_risk_clients: number
    average_lifetime_value: number
    retention_rate: number
  }> => {
    // This could be a dedicated endpoint, but for now we'll calculate from client list
    const response = await apiClient.get<ClientListResponse>('/clients', { params: { limit: 1000 } })
    const clients = response.data.clients

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      total_clients: response.data.total_clients,
      new_clients_this_month: clients.filter(c => new Date(c.created_at) >= thisMonth).length,
      vip_clients: clients.filter(c => c.customer_type === 'vip').length,
      at_risk_clients: clients.filter(c => c.customer_type === 'at_risk').length,
      average_lifetime_value: clients.reduce((sum, c) => sum + c.total_spent, 0) / clients.length || 0,
      retention_rate: 0.82 // This would be calculated based on visit patterns
    }
  }
}

export default clientsApi
