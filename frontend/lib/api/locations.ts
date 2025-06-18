/**
 * Locations API service
 */
import apiClient from './client'
import type { Location, Barber } from './client'

interface LocationCreate {
  name: string
  location_code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  franchise_type?: string
  operating_hours: Record<string, string>
  mentor_id?: number
  capacity?: number
}

interface LocationUpdate {
  name?: string
  address?: string
  phone?: string
  email?: string
  operating_hours?: Record<string, string>
  mentor_id?: number
  is_active?: boolean
  capacity?: number
}

interface LocationFilter {
  skip?: number
  limit?: number
  is_active?: boolean
  franchise_type?: string
}

interface LocationAnalytics {
  location_id: number
  location_name: string
  period_start: string
  period_end: string
  total_revenue: number
  total_appointments: number
  avg_6fb_score: number
  client_retention_rate: number
  booking_efficiency: number
  barber_count: number
  revenue_per_barber: number
  top_services: Array<{
    name: string
    count: number
    revenue: number
  }>
}

export const locationsService = {
  /**
   * Get list of locations
   */
  async getLocations(filters?: LocationFilter): Promise<Location[]> {
    const params = new URLSearchParams()
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.franchise_type) params.append('franchise_type', filters.franchise_type)

    const response = await apiClient.get<Location[]>(`/locations?${params.toString()}`)
    return response.data
  },

  /**
   * Get specific location
   */
  async getLocation(locationId: number): Promise<Location> {
    const response = await apiClient.get<Location>(`/locations/${locationId}`)
    return response.data
  },

  /**
   * Create new location
   */
  async createLocation(data: LocationCreate): Promise<Location> {
    const response = await apiClient.post<Location>('/locations', data)
    return response.data
  },

  /**
   * Update location
   */
  async updateLocation(locationId: number, data: LocationUpdate): Promise<Location> {
    const response = await apiClient.put<Location>(`/locations/${locationId}`, data)
    return response.data
  },

  /**
   * Get location analytics
   */
  async getLocationAnalytics(locationId: number, periodDays: number = 30): Promise<LocationAnalytics> {
    const response = await apiClient.get<LocationAnalytics>(`/locations/${locationId}/analytics`, {
      params: { period_days: periodDays }
    })
    return response.data
  },

  /**
   * Get barbers for location
   */
  async getLocationBarbers(locationId: number): Promise<Array<{
    id: number
    name: string
    email: string
    phone?: string
    status: string
    hire_date: string
  }>> {
    const response = await apiClient.get(`/locations/${locationId}/barbers`)
    return response.data
  },

  /**
   * Assign mentor to location
   */
  async assignMentor(locationId: number, mentorId: number): Promise<{
    message: string
    location_id: number
    mentor_id: number
    mentor_name: string
  }> {
    const response = await apiClient.post(`/locations/${locationId}/assign-mentor`, null, {
      params: { mentor_id: mentorId }
    })
    return response.data
  },
}