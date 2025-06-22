/**
 * Enhanced Locations API service with calendar integration
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse, Location } from './client'

// === TYPE DEFINITIONS ===

export interface ExtendedLocation extends Location {
  // Additional location details
  timezone: string
  business_hours: LocationHours[]
  special_hours?: SpecialHours[]
  amenities?: string[]
  services_offered?: number[] // Service IDs
  staff_count?: number
  
  // Contact information
  website?: string
  social_media?: {
    facebook?: string
    instagram?: string
    google_business?: string
  }
  
  // Business information
  business_license?: string
  tax_id?: string
  insurance_info?: string
  
  // Booking settings
  booking_settings: LocationBookingSettings
  
  // Performance metrics
  stats?: LocationStats
  
  // Images and media
  images?: LocationImage[]
  virtual_tour_url?: string
}

export interface LocationHours {
  id: number
  location_id: number
  day_of_week: number // 0-6 (Sunday-Saturday)
  is_open: boolean
  open_time?: string // HH:MM format
  close_time?: string
  is_24_hours?: boolean
  break_start?: string
  break_end?: string
  notes?: string
}

export interface SpecialHours {
  id: number
  location_id: number
  date: string // ISO date
  reason: string
  is_closed: boolean
  open_time?: string
  close_time?: string
  notes?: string
  created_at: string
}

export interface LocationBookingSettings {
  id: number
  location_id: number
  
  // Booking windows
  advance_booking_days: number
  min_advance_hours: number
  same_day_booking_cutoff: string // HH:MM format
  
  // Cancellation policies
  cancellation_window_hours: number
  cancellation_fee_type: 'none' | 'percentage' | 'fixed'
  cancellation_fee_amount?: number
  
  // Reschedule policies
  reschedule_window_hours: number
  reschedule_fee_type: 'none' | 'percentage' | 'fixed'
  reschedule_fee_amount?: number
  max_reschedules: number
  
  // Payment settings
  require_payment_method: boolean
  require_deposit: boolean
  default_deposit_type: 'percentage' | 'fixed'
  default_deposit_amount: number
  auto_charge_no_shows: boolean
  
  // Communication settings
  send_confirmation_email: boolean
  send_confirmation_sms: boolean
  send_reminder_email: boolean
  send_reminder_sms: boolean
  reminder_hours_before: number[]
  
  // Other settings
  allow_walk_ins: boolean
  buffer_time_minutes: number
  max_concurrent_bookings: number
  auto_confirm_bookings: boolean
  
  created_at: string
  updated_at: string
}

export interface LocationImage {
  id: number
  location_id: number
  type: 'interior' | 'exterior' | 'staff' | 'work' | 'amenities'
  url: string
  thumbnail_url?: string
  caption?: string
  is_primary: boolean
  display_order: number
  created_at: string
}

export interface LocationStats {
  location_id: number
  period_start: string
  period_end: string
  
  // Appointment metrics
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_shows: number
  
  // Revenue metrics
  total_revenue: number
  average_ticket: number
  
  // Utilization metrics
  total_available_hours: number
  total_booked_hours: number
  utilization_rate: number
  
  // Customer metrics
  unique_clients: number
  new_clients: number
  returning_clients: number
  client_retention_rate: number
  
  // Staff metrics
  active_barbers: number
  average_barber_rating: number
  
  // Popular times
  busiest_hours: Array<{
    hour: number
    appointment_count: number
  }>
  busiest_days: Array<{
    day_of_week: number
    appointment_count: number
  }>
  
  // Service breakdown
  popular_services: Array<{
    service_id: number
    service_name: string
    count: number
    revenue: number
  }>
}

export interface LocationFilter {
  is_active?: boolean
  franchise_type?: string
  city?: string
  state?: string
  zip_code?: string
  has_availability?: boolean
  service_id?: number
  within_radius?: {
    latitude: number
    longitude: number
    radius_miles: number
  }
  search?: string
  skip?: number
  limit?: number
}

export interface CreateLocationRequest {
  name: string
  location_code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  franchise_type: string
  mentor_id?: number
  timezone: string
  capacity?: number
  business_hours: Omit<LocationHours, 'id' | 'location_id'>[]
  booking_settings?: Partial<LocationBookingSettings>
  amenities?: string[]
  website?: string
  social_media?: ExtendedLocation['social_media']
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {
  is_active?: boolean
}

// Legacy interface for backward compatibility
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

// === LOCATIONS API SERVICE ===

export const locationsService = {
  // === LOCATIONS CRUD ===

  /**
   * Get list of locations with filtering
   */
  async getLocations(filters?: LocationFilter): Promise<PaginatedResponse<ExtendedLocation>> {
    const params = new URLSearchParams()
    
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.franchise_type) params.append('franchise_type', filters.franchise_type)
    if (filters?.city) params.append('city', filters.city)
    if (filters?.state) params.append('state', filters.state)
    if (filters?.zip_code) params.append('zip_code', filters.zip_code)
    if (filters?.has_availability !== undefined) params.append('has_availability', filters.has_availability.toString())
    if (filters?.service_id) params.append('service_id', filters.service_id.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    if (filters?.within_radius) {
      params.append('latitude', filters.within_radius.latitude.toString())
      params.append('longitude', filters.within_radius.longitude.toString())
      params.append('radius_miles', filters.within_radius.radius_miles.toString())
    }

    const response = await apiClient.get<PaginatedResponse<ExtendedLocation>>(`/locations?${params.toString()}`)
    return response.data
  },

  /**
   * Get location by ID
   */
  async getLocation(locationId: number, includeStats = false): Promise<ApiResponse<ExtendedLocation>> {
    const params = includeStats ? '?include_stats=true' : ''
    const response = await apiClient.get<ExtendedLocation>(`/locations/${locationId}${params}`)
    return { data: response.data }
  },

  /**
   * Create new location
   */
  async createLocation(data: CreateLocationRequest): Promise<ApiResponse<ExtendedLocation>> {
    const response = await apiClient.post<ExtendedLocation>('/locations', data)
    return { data: response.data }
  },

  /**
   * Update location
   */
  async updateLocation(locationId: number, data: UpdateLocationRequest): Promise<ApiResponse<ExtendedLocation>> {
    const response = await apiClient.patch<ExtendedLocation>(`/locations/${locationId}`, data)
    return { data: response.data }
  },

  /**
   * Delete location (soft delete)
   */
  async deleteLocation(locationId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/locations/${locationId}`)
    return { data: response.data }
  },

  /**
   * Toggle location active status
   */
  async toggleLocationStatus(locationId: number): Promise<ApiResponse<ExtendedLocation>> {
    const response = await apiClient.post<ExtendedLocation>(`/locations/${locationId}/toggle-status`)
    return { data: response.data }
  },

  // === BUSINESS HOURS ===

  /**
   * Get location business hours
   */
  async getBusinessHours(locationId: number): Promise<ApiResponse<LocationHours[]>> {
    const response = await apiClient.get<LocationHours[]>(`/locations/${locationId}/hours`)
    return { data: response.data }
  },

  /**
   * Update business hours
   */
  async updateBusinessHours(
    locationId: number,
    hours: Omit<LocationHours, 'id' | 'location_id'>[]
  ): Promise<ApiResponse<LocationHours[]>> {
    const response = await apiClient.post<LocationHours[]>(`/locations/${locationId}/hours`, { hours })
    return { data: response.data }
  },

  /**
   * Get special hours (holidays, closures, etc.)
   */
  async getSpecialHours(
    locationId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<SpecialHours[]>> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const response = await apiClient.get<SpecialHours[]>(`/locations/${locationId}/special-hours?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Add special hours
   */
  async addSpecialHours(
    locationId: number,
    data: Omit<SpecialHours, 'id' | 'location_id' | 'created_at'>
  ): Promise<ApiResponse<SpecialHours>> {
    const response = await apiClient.post<SpecialHours>(`/locations/${locationId}/special-hours`, data)
    return { data: response.data }
  },

  /**
   * Update special hours
   */
  async updateSpecialHours(
    specialHoursId: number,
    data: Partial<SpecialHours>
  ): Promise<ApiResponse<SpecialHours>> {
    const response = await apiClient.patch<SpecialHours>(`/locations/special-hours/${specialHoursId}`, data)
    return { data: response.data }
  },

  /**
   * Delete special hours
   */
  async deleteSpecialHours(specialHoursId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/locations/special-hours/${specialHoursId}`)
    return { data: response.data }
  },

  // === BOOKING SETTINGS ===

  /**
   * Get location booking settings
   */
  async getBookingSettings(locationId: number): Promise<ApiResponse<LocationBookingSettings>> {
    const response = await apiClient.get<LocationBookingSettings>(`/locations/${locationId}/booking-settings`)
    return { data: response.data }
  },

  /**
   * Update booking settings
   */
  async updateBookingSettings(
    locationId: number,
    data: Partial<LocationBookingSettings>
  ): Promise<ApiResponse<LocationBookingSettings>> {
    const response = await apiClient.patch<LocationBookingSettings>(`/locations/${locationId}/booking-settings`, data)
    return { data: response.data }
  },

  // === LOCATION IMAGES ===

  /**
   * Get location images
   */
  async getImages(locationId: number): Promise<ApiResponse<LocationImage[]>> {
    const response = await apiClient.get<LocationImage[]>(`/locations/${locationId}/images`)
    return { data: response.data }
  },

  /**
   * Upload location image
   */
  async uploadImage(
    locationId: number,
    file: File,
    type: LocationImage['type'],
    caption?: string,
    isPrimary = false
  ): Promise<ApiResponse<LocationImage>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (caption) formData.append('caption', caption)
    formData.append('is_primary', isPrimary.toString())

    const response = await apiClient.post<LocationImage>(`/locations/${locationId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return { data: response.data }
  },

  /**
   * Update image details
   */
  async updateImage(imageId: number, data: Partial<LocationImage>): Promise<ApiResponse<LocationImage>> {
    const response = await apiClient.patch<LocationImage>(`/locations/images/${imageId}`, data)
    return { data: response.data }
  },

  /**
   * Delete image
   */
  async deleteImage(imageId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/locations/images/${imageId}`)
    return { data: response.data }
  },

  /**
   * Reorder images
   */
  async reorderImages(imageOrders: Array<{ id: number; display_order: number }>): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/locations/images/reorder', { images: imageOrders })
    return { data: response.data }
  },

  // === STATISTICS ===

  /**
   * Get location statistics
   */
  async getStats(
    locationId: number,
    startDate: string,
    endDate: string,
    compareWithPrevious = false
  ): Promise<ApiResponse<LocationStats & { comparison?: Partial<LocationStats> }>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      compare_with_previous: compareWithPrevious.toString()
    })

    const response = await apiClient.get(`/locations/${locationId}/stats?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get location performance comparison
   */
  async getPerformanceComparison(
    locationIds: number[],
    startDate: string,
    endDate: string,
    metric: 'revenue' | 'appointments' | 'utilization' | 'satisfaction' = 'revenue'
  ): Promise<ApiResponse<Array<{
    location_id: number
    location_name: string
    metric_value: number
    rank: number
    change_from_previous: number
  }>>> {
    const params = new URLSearchParams({
      location_ids: locationIds.join(','),
      start_date: startDate,
      end_date: endDate,
      metric
    })

    const response = await apiClient.get(`/locations/performance-comparison?${params.toString()}`)
    return { data: response.data }
  },

  // === LEGACY SUPPORT ===

  /**
   * Get location analytics (legacy)
   */
  async getLocationAnalytics(locationId: number, periodDays: number = 30): Promise<LocationAnalytics> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000)
    
    const response = await this.getStats(
      locationId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )
    
    // Transform new stats format to legacy format
    const stats = response.data
    return {
      location_id: stats.location_id,
      location_name: '',
      period_start: stats.period_start,
      period_end: stats.period_end,
      total_revenue: stats.total_revenue,
      total_appointments: stats.total_appointments,
      avg_6fb_score: 0,
      client_retention_rate: stats.client_retention_rate,
      booking_efficiency: stats.utilization_rate,
      barber_count: stats.active_barbers,
      revenue_per_barber: stats.total_revenue / Math.max(stats.active_barbers, 1),
      top_services: stats.popular_services.map(s => ({
        name: s.service_name,
        count: s.count,
        revenue: s.revenue
      }))
    }
  },

  /**
   * Get barbers for location (legacy)
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
   * Assign mentor to location (legacy)
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

  // === UTILITY METHODS ===

  /**
   * Format location address
   */
  formatAddress(location: ExtendedLocation, includePhone = false): string {
    let address = `${location.address}, ${location.city}, ${location.state} ${location.zip_code}`
    if (includePhone) {
      address += `\nPhone: ${location.phone}`
    }
    return address
  },

  /**
   * Get location display name
   */
  getDisplayName(location: ExtendedLocation): string {
    return `${location.name} (${location.location_code})`
  },

  /**
   * Check if location is open at specific time
   */
  isLocationOpen(
    location: ExtendedLocation,
    targetDate: Date,
    targetTime?: string
  ): boolean {
    const dayOfWeek = targetDate.getDay()
    const dayHours = location.business_hours?.find(h => h.day_of_week === dayOfWeek)
    
    if (!dayHours || !dayHours.is_open) return false
    
    // Check for special hours override
    const dateStr = targetDate.toISOString().split('T')[0]
    const specialHours = location.special_hours?.find(sh => sh.date === dateStr)
    
    if (specialHours) {
      if (specialHours.is_closed) return false
      if (!targetTime) return true
      
      // Check special hours time range
      if (specialHours.open_time && specialHours.close_time) {
        return targetTime >= specialHours.open_time && targetTime <= specialHours.close_time
      }
    }
    
    if (!targetTime) return true
    
    // Check regular business hours
    if (dayHours.is_24_hours) return true
    if (!dayHours.open_time || !dayHours.close_time) return false
    
    return targetTime >= dayHours.open_time && targetTime <= dayHours.close_time
  },

  /**
   * Get location timezone
   */
  getTimezone(location: ExtendedLocation): string {
    return location.timezone || 'America/New_York'
  },

  /**
   * Calculate distance between coordinates
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  },

  /**
   * Get business hours for display
   */
  formatBusinessHours(hours: LocationHours[]): Record<string, string> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const formatted: Record<string, string> = {}
    
    hours.forEach(h => {
      const dayName = dayNames[h.day_of_week]
      if (!h.is_open) {
        formatted[dayName] = 'Closed'
      } else if (h.is_24_hours) {
        formatted[dayName] = '24 Hours'
      } else if (h.open_time && h.close_time) {
        let timeStr = `${this.formatTime(h.open_time)} - ${this.formatTime(h.close_time)}`
        if (h.break_start && h.break_end) {
          timeStr += ` (Break: ${this.formatTime(h.break_start)} - ${this.formatTime(h.break_end)})`
        }
        formatted[dayName] = timeStr
      } else {
        formatted[dayName] = 'Hours vary'
      }
    })
    
    return formatted
  },

  /**
   * Format time from 24-hour to 12-hour format
   */
  formatTime(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  },

  /**
   * Get primary location image
   */
  getPrimaryImage(location: ExtendedLocation): string | null {
    const primaryImage = location.images?.find(img => img.is_primary)
    return primaryImage?.url || location.images?.[0]?.url || null
  }
}