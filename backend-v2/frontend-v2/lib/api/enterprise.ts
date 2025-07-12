import apiClient from './client'

// Types
export interface Organization {
  id: number
  name: string
  type: 'headquarters' | 'location' | 'franchise' | 'independent'
  billing_plan: 'individual' | 'studio' | 'salon' | 'enterprise'
  status: 'active' | 'inactive' | 'trial'
  trial_ends_at?: string
  created_at: string
  locations_count: number
  users_count: number
  revenue_current_month: number
  appointments_current_month: number
  address?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  trial_duration_days?: number
}

export interface Location {
  id: number
  name: string
  code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  email?: string
  status: 'active' | 'inactive' | 'coming_soon' | 'closed'
  compensation_model: 'booth_rental' | 'commission' | 'hybrid' | 'custom'
  total_chairs: number
  active_chairs: number
  revenue_current_month: number
  appointments_current_month: number
  utilization_rate: number
  organization_id: number
  timezone: string
  currency: string
  business_hours: Record<string, any>
  compensation_config: Record<string, any>
  description?: string
  created_at: string
  updated_at: string
}

export interface UserOrganization {
  id: number
  user_id: number
  organization_id: number
  role: 'super_admin' | 'admin' | 'owner' | 'manager' | 'barber' | 'user'
  permissions: string[]
  user: {
    id: number
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }
  joined_at: string
}

export interface EnterpriseStats {
  total_revenue: number
  total_appointments: number
  total_locations: number
  total_users: number
  avg_utilization: number
  revenue_growth: number
  top_locations: Location[]
  recent_activity: any[]
}

export interface UserInviteData {
  email: string
  first_name?: string
  last_name?: string
  role: string
  permissions: string[]
  locations: number[]
  message?: string
  send_welcome_email: boolean
}

export interface OrganizationCreateData {
  name: string
  type: string
  billing_plan: string
  address?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  trial_duration_days?: number
}

export interface LocationCreateData {
  name: string
  code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  email?: string
  status: string
  compensation_model: string
  total_chairs: number
  active_chairs: number
  timezone: string
  currency: string
  business_hours: Record<string, any>
  compensation_config: Record<string, any>
  description?: string
}

// Enterprise Management API
export const enterpriseApi = {
  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    const response = await apiClient.get('/enterprise/organizations')
    return response.data
  },

  async getOrganization(id: number): Promise<Organization> {
    const response = await apiClient.get(`/enterprise/organizations/${id}`)
    return response.data
  },

  async createOrganization(data: OrganizationCreateData): Promise<Organization> {
    const response = await apiClient.post('/enterprise/organizations', data)
    return response.data
  },

  async updateOrganization(id: number, data: Partial<OrganizationCreateData>): Promise<Organization> {
    const response = await apiClient.put(`/enterprise/organizations/${id}`, data)
    return response.data
  },

  async deleteOrganization(id: number): Promise<void> {
    await apiClient.delete(`/enterprise/organizations/${id}`)
  },

  // Locations
  async getLocations(organizationId?: number): Promise<Location[]> {
    const params = organizationId ? { organization_id: organizationId } : {}
    const response = await apiClient.get('/enterprise/locations', { params })
    return response.data
  },

  async getLocation(id: number): Promise<Location> {
    const response = await apiClient.get(`/enterprise/locations/${id}`)
    return response.data
  },

  async createLocation(data: LocationCreateData): Promise<Location> {
    const response = await apiClient.post('/enterprise/locations', data)
    return response.data
  },

  async updateLocation(id: number, data: Partial<LocationCreateData>): Promise<Location> {
    const response = await apiClient.put(`/enterprise/locations/${id}`, data)
    return response.data
  },

  async deleteLocation(id: number): Promise<void> {
    await apiClient.delete(`/enterprise/locations/${id}`)
  },

  // Organization Users
  async getOrganizationUsers(organizationId: number): Promise<UserOrganization[]> {
    const response = await apiClient.get(`/enterprise/organizations/${organizationId}/users`)
    return response.data
  },

  async inviteUser(organizationId: number, data: UserInviteData): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/enterprise/organizations/${organizationId}/invite`, data)
    return response.data
  },

  async updateUserRole(
    organizationId: number,
    userId: number,
    data: { role: string; permissions: string[]; locations: number[] }
  ): Promise<UserOrganization> {
    const response = await apiClient.put(`/enterprise/organizations/${organizationId}/users/${userId}`, data)
    return response.data
  },

  async removeUser(organizationId: number, userId: number): Promise<void> {
    await apiClient.delete(`/enterprise/organizations/${organizationId}/users/${userId}`)
  },

  // Enterprise Statistics
  async getEnterpriseStats(): Promise<EnterpriseStats> {
    const response = await apiClient.get('/enterprise/stats')
    return response.data
  },

  async getOrganizationStats(organizationId: number): Promise<any> {
    const response = await apiClient.get(`/enterprise/organizations/${organizationId}/stats`)
    return response.data
  },

  async getLocationStats(locationId: number): Promise<any> {
    const response = await apiClient.get(`/enterprise/locations/${locationId}/stats`)
    return response.data
  },

  // Multi-location operations
  async getMultiLocationReport(organizationId: number, dateRange?: { start: string; end: string }): Promise<any> {
    const params = dateRange ? { start_date: dateRange.start, end_date: dateRange.end } : {}
    const response = await apiClient.get(`/enterprise/organizations/${organizationId}/multi-location-report`, { params })
    return response.data
  },

  async syncLocationData(locationId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/enterprise/locations/${locationId}/sync`)
    return response.data
  },

  // Bulk operations
  async bulkUpdateLocations(organizationId: number, updates: any[]): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post(`/enterprise/organizations/${organizationId}/bulk-update-locations`, {
      updates
    })
    return response.data
  },

  async bulkInviteUsers(organizationId: number, invites: UserInviteData[]): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post(`/enterprise/organizations/${organizationId}/bulk-invite`, {
      invites
    })
    return response.data
  },

  // Location access control
  async getUserLocationAccess(userId: number): Promise<number[]> {
    const response = await apiClient.get(`/enterprise/users/${userId}/location-access`)
    return response.data
  },

  async updateUserLocationAccess(
    userId: number,
    locationIds: number[]
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/enterprise/users/${userId}/location-access`, {
      location_ids: locationIds
    })
    return response.data
  },

  // Chair and resource management
  async getLocationChairs(locationId: number): Promise<any[]> {
    const response = await apiClient.get(`/enterprise/locations/${locationId}/chairs`)
    return response.data
  },

  async updateChairStatus(
    locationId: number,
    chairId: number,
    status: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/enterprise/locations/${locationId}/chairs/${chairId}/status`, {
      status
    })
    return response.data
  },

  async assignBarberToChair(
    locationId: number,
    chairId: number,
    barberId: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/enterprise/locations/${locationId}/chairs/${chairId}/assign`, {
      barber_id: barberId
    })
    return response.data
  },

  // Compensation management
  async getCompensationPlans(locationId: number): Promise<any[]> {
    const response = await apiClient.get(`/enterprise/locations/${locationId}/compensation-plans`)
    return response.data
  },

  async createCompensationPlan(locationId: number, data: any): Promise<any> {
    const response = await apiClient.post(`/enterprise/locations/${locationId}/compensation-plans`, data)
    return response.data
  },

  async updateCompensationPlan(locationId: number, planId: number, data: any): Promise<any> {
    const response = await apiClient.put(`/enterprise/locations/${locationId}/compensation-plans/${planId}`, data)
    return response.data
  },

  // Enterprise exports
  async exportOrganizationData(organizationId: number, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/enterprise/organizations/${organizationId}/export`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  },

  async exportLocationData(locationId: number, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/enterprise/locations/${locationId}/export`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  }
}

export default enterpriseApi