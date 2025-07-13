/**
 * Clients API Client
 * 
 * Provides comprehensive client/customer management functionality including:
 * - Client profile creation and management
 * - Client search and filtering
 * - Client history and analytics
 * - Communication preferences and notes
 * - Client recommendations and insights
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface ClientCreate {
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string // YYYY-MM-DD format
  notes?: string
  tags?: string
  preferred_barber_id?: number
  preferred_services?: string[]
  communication_preferences?: Record<string, any>
}

export interface ClientUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  date_of_birth?: string
  notes?: string
  tags?: string
  preferred_barber_id?: number
  preferred_services?: string[]
  communication_preferences?: Record<string, any>
}

export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  notes?: string
  tags?: string
  preferred_barber_id?: number
  preferred_services?: string[]
  communication_preferences?: Record<string, any>
  customer_type: string
  total_visits: number
  total_spent: number
  average_ticket: number
  visit_frequency_days?: number
  no_show_count: number
  cancellation_count: number
  referral_count: number
  first_visit_date?: string
  last_visit_date?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface ClientListResponse {
  clients: Client[]
  total: number
  page: number
  page_size: number
}

export interface ClientHistory {
  appointments: Appointment[]
  total_appointments: number
  total_spent: number
  average_ticket: number
  no_shows: number
  cancellations: number
}

export interface ClientAnalytics {
  client_lifetime_value: number
  predicted_next_visit: string
  visit_frequency_trend: string
  spending_trend: string
  risk_score: number
  satisfaction_score?: number
  retention_probability: number
  recommended_services: string[]
}

export interface ClientRecommendations {
  services: string[]
  upsell_opportunities: string[]
  retention_strategies: string[]
  next_appointment_suggestions: string[]
}

export interface ClientCommunicationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  marketing_emails: boolean
  appointment_reminders: boolean
  promotional_offers: boolean
  preferred_contact_method: string
  notification_timing: Record<string, any>
}

export interface ClientNote {
  id: number
  client_id: number
  note: string
  created_by: string
  created_at: string
  is_private: boolean
}

export interface ClientNoteCreate {
  note: string
  is_private: boolean
}

export interface ClientTagsUpdate {
  tags: string[]
}

export interface ClientSearchRequest {
  query: string
  filters?: {
    customer_type?: string
    tags?: string[]
    preferred_barber_id?: number
    date_range?: {
      start: string
      end: string
    }
  }
}

export interface ClientSearchResponse {
  clients: Client[]
  total: number
  query: string
}

export interface ClientDashboardMetrics {
  total_clients: number
  new_clients_this_month: number
  active_clients: number
  retention_rate: number
  average_lifetime_value: number
  top_customer_types: Array<{
    type: string
    count: number
    percentage: number
  }>
  recent_client_activity: Array<{
    client_id: number
    client_name: string
    activity_type: string
    activity_date: string
  }>
}

export interface AdvancedSearchFilters {
  query?: string
  customer_type?: string
  tags?: string[]
  preferred_barber_id?: number
  min_total_spent?: number
  max_total_spent?: number
  min_visits?: number
  max_visits?: number
  first_visit_start?: string
  first_visit_end?: string
  last_visit_start?: string
  last_visit_end?: string
  has_no_shows?: boolean
  has_cancellations?: boolean
  risk_level?: string
}

export interface ClientFilters {
  page?: number
  page_size?: number
  search?: string
  customer_type?: string
  tags?: string
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
// Clients API Client
// ===============================

export const clientsApi = {
  /**
   * Create a new client
   */
  async createClient(clientData: ClientCreate): Promise<Client> {
    const response = await fetch(`${API_BASE_URL}/api/v1/clients/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(clientData)
    })

    return handleResponse(response)
  },

  /**
   * Get list of clients with pagination and filtering
   */
  async getClients(filters: ClientFilters = {}): Promise<ClientListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific client by ID
   */
  async getClient(clientId: number): Promise<Client> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Update client information
   */
  async updateClient(clientId: number, updates: ClientUpdate): Promise<Client> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      }
    )

    return handleResponse(response)
  },

  /**
   * Delete client
   */
  async deleteClient(clientId: number): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client appointment history and metrics
   */
  async getClientHistory(clientId: number): Promise<ClientHistory> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/history`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Update client customer type
   */
  async updateClientCustomerType(
    clientId: number, 
    customerType: string
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/customer-type`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ customer_type: customerType })
      }
    )

    return handleResponse(response)
  },

  /**
   * Search clients by query
   */
  async searchClients(searchRequest: ClientSearchRequest): Promise<ClientSearchResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/clients/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(searchRequest)
    })

    return handleResponse(response)
  },

  /**
   * Advanced client search with multiple filters
   */
  async advancedSearchClients(filters: AdvancedSearchFilters): Promise<ClientListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/advanced-search${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client analytics and insights
   */
  async getClientAnalytics(clientId: number): Promise<ClientAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/analytics`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client recommendations
   */
  async getClientRecommendations(clientId: number): Promise<ClientRecommendations> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/recommendations`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client communication preferences
   */
  async getClientCommunicationPreferences(clientId: number): Promise<ClientCommunicationPreferences> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/communication-preferences`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Update client communication preferences
   */
  async updateClientCommunicationPreferences(
    clientId: number,
    preferences: Partial<ClientCommunicationPreferences>
  ): Promise<ClientCommunicationPreferences> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/communication-preferences`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences)
      }
    )

    return handleResponse(response)
  },

  /**
   * Add a note to client profile
   */
  async addClientNote(clientId: number, noteData: ClientNoteCreate): Promise<ClientNote> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/notes`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(noteData)
      }
    )

    return handleResponse(response)
  },

  /**
   * Update client tags
   */
  async updateClientTags(clientId: number, tags: string[]): Promise<Client> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/${clientId}/tags`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tags })
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client dashboard metrics
   */
  async getClientDashboardMetrics(): Promise<ClientDashboardMetrics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/clients/dashboard/metrics`,
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
   * Get client full name
   */
  getFullName(client: Client): string {
    return `${client.first_name} ${client.last_name}`
  },

  /**
   * Format client phone number
   */
  formatPhone(phone?: string): string {
    if (!phone) return ''
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    
    return phone
  },

  /**
   * Calculate client age from date of birth
   */
  calculateAge(dateOfBirth?: string): number | null {
    if (!dateOfBirth) return null
    
    const birth = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  },

  /**
   * Get client status based on recent activity
   */
  getClientStatus(client: Client): 'active' | 'inactive' | 'new' | 'at_risk' {
    const now = new Date()
    const lastVisit = client.last_visit_date ? new Date(client.last_visit_date) : null
    const firstVisit = client.first_visit_date ? new Date(client.first_visit_date) : null
    
    // New client (first visit within 30 days)
    if (firstVisit && (now.getTime() - firstVisit.getTime()) < (30 * 24 * 60 * 60 * 1000)) {
      return 'new'
    }
    
    // At risk (no visit in 90+ days)
    if (lastVisit && (now.getTime() - lastVisit.getTime()) > (90 * 24 * 60 * 60 * 1000)) {
      return 'at_risk'
    }
    
    // Active (visit within 60 days)
    if (lastVisit && (now.getTime() - lastVisit.getTime()) < (60 * 24 * 60 * 60 * 1000)) {
      return 'active'
    }
    
    return 'inactive'
  },

  /**
   * Get client loyalty tier based on spending/visits
   */
  getLoyaltyTier(client: Client): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (client.total_spent >= 1000 || client.total_visits >= 20) {
      return 'platinum'
    } else if (client.total_spent >= 500 || client.total_visits >= 10) {
      return 'gold'
    } else if (client.total_spent >= 200 || client.total_visits >= 5) {
      return 'silver'
    }
    return 'bronze'
  },

  /**
   * Parse client tags into array
   */
  parseTags(tags?: string): string[] {
    if (!tags) return []
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
  },

  /**
   * Format tags array into string
   */
  formatTags(tags: string[]): string {
    return tags.join(', ')
  },

  /**
   * Check if client has specific tag
   */
  hasTag(client: Client, tag: string): boolean {
    const clientTags = this.parseTags(client.tags)
    return clientTags.some(t => t.toLowerCase() === tag.toLowerCase())
  },

  /**
   * Get next suggested appointment date based on visit frequency
   */
  getNextSuggestedAppointment(client: Client): Date | null {
    if (!client.last_visit_date || !client.visit_frequency_days) {
      return null
    }
    
    const lastVisit = new Date(client.last_visit_date)
    const nextDate = new Date(lastVisit)
    nextDate.setDate(nextDate.getDate() + client.visit_frequency_days)
    
    return nextDate
  }
}

export default clientsApi