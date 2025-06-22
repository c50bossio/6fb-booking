/**
 * Barbers API - Managing barber profiles, schedules, and availability
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse, Barber } from './client'

// === TYPE DEFINITIONS ===

export interface BarberProfile extends Barber {
  // Extended profile information
  bio?: string
  years_experience?: number
  specialties?: string[]
  languages_spoken?: string[]
  certifications?: BarberCertification[]
  profile_image?: string
  gallery?: BarberGalleryItem[]
  social_media?: {
    instagram?: string
    facebook?: string
    tiktok?: string
    website?: string
  }
  
  // Performance metrics
  average_rating?: number
  total_reviews?: number
  total_appointments?: number
  repeat_client_rate?: number
  on_time_rate?: number
  
  // Business information
  business_name?: string
  business_license?: string
  insurance_info?: string
  tax_id?: string
  
  // Preferences
  preferred_payment_methods?: string[]
  booking_preferences?: {
    auto_confirm: boolean
    require_deposit: boolean
    cancellation_policy: string
    reschedule_policy: string
  }
}

export interface BarberCertification {
  id: number
  name: string
  issuer: string
  issue_date: string
  expiry_date?: string
  certificate_number?: string
  verification_url?: string
  is_verified: boolean
}

export interface BarberGalleryItem {
  id: number
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  caption?: string
  tags?: string[]
  created_at: string
}

export interface BarberSchedule {
  id: number
  barber_id: number
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM format
  end_time: string
  break_start?: string
  break_end?: string
  is_working: boolean
  location_id: number
  location_name?: string
  
  // Override settings for specific dates
  effective_from?: string
  effective_until?: string
  is_temporary?: boolean
  notes?: string
}

export interface BarberAvailabilityBlock {
  id: number
  barber_id: number
  start_datetime: string // ISO datetime
  end_datetime: string
  type: 'unavailable' | 'break' | 'vacation' | 'sick' | 'training' | 'other'
  reason?: string
  is_recurring: boolean
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    days_of_week?: number[]
    end_date?: string
  }
  created_by: number
  approved_by?: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface BarberTimeSlot {
  start_time: string
  end_time: string
  is_available: boolean
  is_booked: boolean
  appointment_id?: number
  client_name?: string
  service_name?: string
  buffer_time: number
  reason?: string
}

export interface BarberStats {
  barber_id: number
  period_start: string
  period_end: string
  
  // Appointment metrics
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_shows: number
  
  // Revenue metrics
  total_revenue: number
  service_revenue: number
  tip_revenue: number
  product_revenue: number
  average_ticket: number
  
  // Performance metrics
  utilization_rate: number // Percentage of available time booked
  on_time_rate: number
  client_satisfaction: number
  repeat_client_rate: number
  
  // Popular services
  top_services: Array<{
    service_id: number
    service_name: string
    count: number
    revenue: number
  }>
  
  // Time analysis
  busiest_hours: Array<{
    hour: number
    appointment_count: number
  }>
  busiest_days: Array<{
    day_of_week: number
    appointment_count: number
  }>
}

export interface BarberFilter {
  location_id?: number
  is_active?: boolean
  specialties?: string[]
  min_rating?: number
  available_on?: string // Date string
  available_at?: string // Time string
  service_id?: number
  search?: string
  sort_by?: 'name' | 'rating' | 'experience' | 'availability'
  sort_order?: 'asc' | 'desc'
  skip?: number
  limit?: number
}

export interface CreateBarberRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
  location_id: number
  commission_rate?: number
  bio?: string
  years_experience?: number
  specialties?: string[]
  languages_spoken?: string[]
  business_name?: string
  profile_image?: string
}

export interface UpdateBarberRequest extends Partial<CreateBarberRequest> {
  is_active?: boolean
  booking_preferences?: BarberProfile['booking_preferences']
  social_media?: BarberProfile['social_media']
}

export interface ScheduleTemplate {
  id: number
  name: string
  description?: string
  schedule_data: BarberSchedule[]
  is_default: boolean
  created_by: number
}

// === BARBERS API SERVICE ===

export const barbersService = {
  // === BARBER PROFILES ===

  /**
   * Get list of barbers with filtering
   */
  async getBarbers(filters?: BarberFilter): Promise<PaginatedResponse<BarberProfile>> {
    const params = new URLSearchParams()
    
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.min_rating) params.append('min_rating', filters.min_rating.toString())
    if (filters?.available_on) params.append('available_on', filters.available_on)
    if (filters?.available_at) params.append('available_at', filters.available_at)
    if (filters?.service_id) params.append('service_id', filters.service_id.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.sort_by) params.append('sort_by', filters.sort_by)
    if (filters?.sort_order) params.append('sort_order', filters.sort_order)
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    if (filters?.specialties?.length) {
      filters.specialties.forEach(specialty => params.append('specialties', specialty))
    }

    const response = await apiClient.get<PaginatedResponse<BarberProfile>>(`/barbers?${params.toString()}`)
    return response.data
  },

  /**
   * Get barber profile by ID
   */
  async getBarber(barberId: number, includeStats = false): Promise<ApiResponse<BarberProfile>> {
    const params = includeStats ? '?include_stats=true' : ''
    const response = await apiClient.get<BarberProfile>(`/barbers/${barberId}${params}`)
    return { data: response.data }
  },

  /**
   * Create new barber
   */
  async createBarber(data: CreateBarberRequest): Promise<ApiResponse<BarberProfile>> {
    const response = await apiClient.post<BarberProfile>('/barbers', data)
    return { data: response.data }
  },

  /**
   * Update barber profile
   */
  async updateBarber(barberId: number, data: UpdateBarberRequest): Promise<ApiResponse<BarberProfile>> {
    const response = await apiClient.patch<BarberProfile>(`/barbers/${barberId}`, data)
    return { data: response.data }
  },

  /**
   * Delete barber (soft delete)
   */
  async deleteBarber(barberId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/barbers/${barberId}`)
    return { data: response.data }
  },

  /**
   * Toggle barber active status
   */
  async toggleBarberStatus(barberId: number): Promise<ApiResponse<BarberProfile>> {
    const response = await apiClient.post<BarberProfile>(`/barbers/${barberId}/toggle-status`)
    return { data: response.data }
  },

  // === BARBER SCHEDULES ===

  /**
   * Get barber's weekly schedule
   */
  async getSchedule(barberId: number, locationId?: number): Promise<ApiResponse<BarberSchedule[]>> {
    const params = locationId ? `?location_id=${locationId}` : ''
    const response = await apiClient.get<BarberSchedule[]>(`/barbers/${barberId}/schedule${params}`)
    return { data: response.data }
  },

  /**
   * Update barber's schedule
   */
  async updateSchedule(barberId: number, schedules: Partial<BarberSchedule>[]): Promise<ApiResponse<BarberSchedule[]>> {
    const response = await apiClient.post<BarberSchedule[]>(`/barbers/${barberId}/schedule`, { schedules })
    return { data: response.data }
  },

  /**
   * Set schedule for specific date range (temporary override)
   */
  async setTemporarySchedule(
    barberId: number,
    startDate: string,
    endDate: string,
    schedules: Partial<BarberSchedule>[],
    reason?: string
  ): Promise<ApiResponse<BarberSchedule[]>> {
    const response = await apiClient.post<BarberSchedule[]>(`/barbers/${barberId}/schedule/temporary`, {
      start_date: startDate,
      end_date: endDate,
      schedules,
      reason
    })
    return { data: response.data }
  },

  /**
   * Get schedule templates
   */
  async getScheduleTemplates(): Promise<ApiResponse<ScheduleTemplate[]>> {
    const response = await apiClient.get<ScheduleTemplate[]>('/barbers/schedule-templates')
    return { data: response.data }
  },

  /**
   * Apply schedule template to barber
   */
  async applyScheduleTemplate(barberId: number, templateId: number): Promise<ApiResponse<BarberSchedule[]>> {
    const response = await apiClient.post<BarberSchedule[]>(`/barbers/${barberId}/apply-template`, {
      template_id: templateId
    })
    return { data: response.data }
  },

  // === AVAILABILITY MANAGEMENT ===

  /**
   * Get barber availability for date range
   */
  async getAvailability(
    barberId: number,
    startDate: string,
    endDate: string,
    serviceId?: number,
    duration?: number
  ): Promise<ApiResponse<Record<string, BarberTimeSlot[]>>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })
    if (serviceId) params.append('service_id', serviceId.toString())
    if (duration) params.append('duration', duration.toString())

    const response = await apiClient.get(`/barbers/${barberId}/availability?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get availability blocks (time off, breaks, etc.)
   */
  async getAvailabilityBlocks(
    barberId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<BarberAvailabilityBlock[]>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })

    const response = await apiClient.get<BarberAvailabilityBlock[]>(`/barbers/${barberId}/availability-blocks?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Create availability block (time off)
   */
  async createAvailabilityBlock(
    barberId: number,
    data: Omit<BarberAvailabilityBlock, 'id' | 'barber_id' | 'created_by' | 'status'>
  ): Promise<ApiResponse<BarberAvailabilityBlock>> {
    const response = await apiClient.post<BarberAvailabilityBlock>(`/barbers/${barberId}/availability-blocks`, data)
    return { data: response.data }
  },

  /**
   * Update availability block
   */
  async updateAvailabilityBlock(
    blockId: number,
    data: Partial<BarberAvailabilityBlock>
  ): Promise<ApiResponse<BarberAvailabilityBlock>> {
    const response = await apiClient.patch<BarberAvailabilityBlock>(`/barbers/availability-blocks/${blockId}`, data)
    return { data: response.data }
  },

  /**
   * Delete availability block
   */
  async deleteAvailabilityBlock(blockId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/barbers/availability-blocks/${blockId}`)
    return { data: response.data }
  },

  /**
   * Approve/reject availability block request
   */
  async processAvailabilityBlock(
    blockId: number,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<ApiResponse<BarberAvailabilityBlock>> {
    const response = await apiClient.post<BarberAvailabilityBlock>(`/barbers/availability-blocks/${blockId}/${action}`, {
      notes
    })
    return { data: response.data }
  },

  // === STATISTICS ===

  /**
   * Get barber performance statistics
   */
  async getStats(
    barberId: number,
    startDate: string,
    endDate: string,
    compareWithPrevious = false
  ): Promise<ApiResponse<BarberStats & { comparison?: Partial<BarberStats> }>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      compare_with_previous: compareWithPrevious.toString()
    })

    const response = await apiClient.get(`/barbers/${barberId}/stats?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get barber leaderboard
   */
  async getLeaderboard(
    locationId?: number,
    metric: 'revenue' | 'appointments' | 'rating' | 'utilization' = 'revenue',
    period = '30d'
  ): Promise<ApiResponse<Array<BarberProfile & { metric_value: number; rank: number }>>> {
    const params = new URLSearchParams({
      metric,
      period
    })
    if (locationId) params.append('location_id', locationId.toString())

    const response = await apiClient.get(`/barbers/leaderboard?${params.toString()}`)
    return { data: response.data }
  },

  // === CERTIFICATIONS ===

  /**
   * Get barber certifications
   */
  async getCertifications(barberId: number): Promise<ApiResponse<BarberCertification[]>> {
    const response = await apiClient.get<BarberCertification[]>(`/barbers/${barberId}/certifications`)
    return { data: response.data }
  },

  /**
   * Add certification
   */
  async addCertification(
    barberId: number,
    data: Omit<BarberCertification, 'id' | 'is_verified'>
  ): Promise<ApiResponse<BarberCertification>> {
    const response = await apiClient.post<BarberCertification>(`/barbers/${barberId}/certifications`, data)
    return { data: response.data }
  },

  /**
   * Update certification
   */
  async updateCertification(
    certificationId: number,
    data: Partial<BarberCertification>
  ): Promise<ApiResponse<BarberCertification>> {
    const response = await apiClient.patch<BarberCertification>(`/barbers/certifications/${certificationId}`, data)
    return { data: response.data }
  },

  /**
   * Delete certification
   */
  async deleteCertification(certificationId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/barbers/certifications/${certificationId}`)
    return { data: response.data }
  },

  // === GALLERY ===

  /**
   * Get barber gallery
   */
  async getGallery(barberId: number): Promise<ApiResponse<BarberGalleryItem[]>> {
    const response = await apiClient.get<BarberGalleryItem[]>(`/barbers/${barberId}/gallery`)
    return { data: response.data }
  },

  /**
   * Upload gallery item
   */
  async uploadGalleryItem(
    barberId: number,
    file: File,
    caption?: string,
    tags?: string[]
  ): Promise<ApiResponse<BarberGalleryItem>> {
    const formData = new FormData()
    formData.append('file', file)
    if (caption) formData.append('caption', caption)
    if (tags) formData.append('tags', JSON.stringify(tags))

    const response = await apiClient.post<BarberGalleryItem>(`/barbers/${barberId}/gallery`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return { data: response.data }
  },

  /**
   * Update gallery item
   */
  async updateGalleryItem(
    itemId: number,
    data: Partial<BarberGalleryItem>
  ): Promise<ApiResponse<BarberGalleryItem>> {
    const response = await apiClient.patch<BarberGalleryItem>(`/barbers/gallery/${itemId}`, data)
    return { data: response.data }
  },

  /**
   * Delete gallery item
   */
  async deleteGalleryItem(itemId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/barbers/gallery/${itemId}`)
    return { data: response.data }
  },

  // === SEARCH AND FILTERING ===

  /**
   * Search barbers
   */
  async searchBarbers(
    query: string,
    filters?: Omit<BarberFilter, 'search'>
  ): Promise<PaginatedResponse<BarberProfile>> {
    return this.getBarbers({
      ...filters,
      search: query
    })
  },

  /**
   * Get available barbers for specific time slot
   */
  async getAvailableBarbers(
    date: string,
    startTime: string,
    duration: number,
    serviceId?: number,
    locationId?: number
  ): Promise<ApiResponse<BarberProfile[]>> {
    const params = new URLSearchParams({
      date,
      start_time: startTime,
      duration: duration.toString()
    })
    if (serviceId) params.append('service_id', serviceId.toString())
    if (locationId) params.append('location_id', locationId.toString())

    const response = await apiClient.get<BarberProfile[]>(`/barbers/available?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get barbers by location
   */
  async getBarbersByLocation(locationId: number, includeInactive = false): Promise<ApiResponse<BarberProfile[]>> {
    const params = includeInactive ? '?include_inactive=true' : ''
    const response = await apiClient.get<BarberProfile[]>(`/locations/${locationId}/barbers${params}`)
    return { data: response.data }
  },

  // === UTILITY METHODS ===

  /**
   * Format barber name
   */
  formatBarberName(barber: BarberProfile, includeBusinessName = true): string {
    const fullName = `${barber.first_name} ${barber.last_name}`
    if (includeBusinessName && barber.business_name) {
      return `${fullName} (${barber.business_name})`
    }
    return fullName
  },

  /**
   * Get barber display image
   */
  getBarberImage(barber: BarberProfile, size: 'sm' | 'md' | 'lg' = 'md'): string {
    if (barber.profile_image) return barber.profile_image
    
    // Generate initials-based avatar URL (you'd implement this based on your avatar service)
    const initials = `${barber.first_name[0]}${barber.last_name[0]}`
    return `/api/avatars/${initials}?size=${size}`
  },

  /**
   * Check if barber is available at specific time
   */
  isBarberAvailable(
    schedule: BarberSchedule[],
    availabilityBlocks: BarberAvailabilityBlock[],
    targetDate: Date,
    startTime: string,
    duration: number
  ): boolean {
    const dayOfWeek = targetDate.getDay()
    const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek && s.is_working)
    
    if (!daySchedule) return false
    
    // Check if time falls within working hours
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [scheduleStartHour, scheduleStartMinute] = daySchedule.start_time.split(':').map(Number)
    const [scheduleEndHour, scheduleEndMinute] = daySchedule.end_time.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = startMinutes + duration
    const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute
    const scheduleEndMinutes = scheduleEndHour * 60 + scheduleEndMinute
    
    if (startMinutes < scheduleStartMinutes || endMinutes > scheduleEndMinutes) {
      return false
    }
    
    // Check for break time conflicts
    if (daySchedule.break_start && daySchedule.break_end) {
      const [breakStartHour, breakStartMinute] = daySchedule.break_start.split(':').map(Number)
      const [breakEndHour, breakEndMinute] = daySchedule.break_end.split(':').map(Number)
      const breakStartMinutes = breakStartHour * 60 + breakStartMinute
      const breakEndMinutes = breakEndHour * 60 + breakEndMinute
      
      if (!(endMinutes <= breakStartMinutes || startMinutes >= breakEndMinutes)) {
        return false
      }
    }
    
    // Check availability blocks
    const targetDateTime = targetDate.toISOString().split('T')[0]
    const conflictingBlocks = availabilityBlocks.filter(block => {
      if (block.status !== 'approved') return false
      
      const blockStart = new Date(block.start_datetime)
      const blockEnd = new Date(block.end_datetime)
      const appointmentStart = new Date(`${targetDateTime}T${startTime}:00`)
      const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60000)
      
      return !(appointmentEnd <= blockStart || appointmentStart >= blockEnd)
    })
    
    return conflictingBlocks.length === 0
  },

  /**
   * Calculate barber utilization rate
   */
  calculateUtilization(stats: BarberStats, totalWorkingHours: number): number {
    if (totalWorkingHours === 0) return 0
    const bookedHours = (stats.completed_appointments * 60) / 60 // Assuming 60 min average
    return (bookedHours / totalWorkingHours) * 100
  },

  /**
   * Get barber specialties as formatted string
   */
  formatSpecialties(barber: BarberProfile): string {
    return barber.specialties?.join(', ') || 'General Hair Services'
  },

  /**
   * Get barber rating display
   */
  formatRating(rating?: number): string {
    if (!rating) return 'No ratings yet'
    return `${rating.toFixed(1)}/5.0`
  }
}