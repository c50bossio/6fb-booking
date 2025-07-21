/**
 * Availability API Client
 * 
 * Provides functions for hierarchical availability management
 * including organization templates, barber schedules, and inheritance
 */

import { APIClient } from './client'

const apiClient = new APIClient()

// Types
interface AvailabilitySchedule {
  [day: string]: {
    start: string
    end: string
    active: boolean
  }
}

interface OrganizationAvailabilityTemplate {
  organization_id: number
  organization_name: string
  effective_hours: {
    default_schedule: AvailabilitySchedule
    inheritance_policy: string
    barber_constraints: {
      can_extend_hours: boolean
      can_add_days: boolean
      requires_approval: boolean
    }
    template_metadata: {
      last_updated: string
      updated_by_role: string
      version: number
    }
  }
  inheritance_enabled: boolean
  override_policy: string
  requires_approval: boolean
  parent_organization_id?: number
  has_parent_hours: boolean
}

interface BarberAvailabilitySummary {
  barber_id: number
  barber_name: string
  barber_email: string
  summary: {
    total_availability_records: number
    sources: {
      individual: number
      organization: number
      inherited: number
      individual_overrides: number
    }
    approval_status: {
      approved: number
      pending: number
      rejected: number
    }
    days_configured: number[]
    days_with_overrides: number[]
    organization_policy: {
      override_policy: string
      requires_approval: boolean
      inheritance_enabled: boolean
    } | null
  }
  effective_availability?: any[]
}

interface StaffAvailabilityOverview {
  organization_id: number
  organization_name: string
  total_staff: number
  organization_policy: {
    override_policy: string
    requires_approval: boolean
    inheritance_enabled: boolean
  }
  staff_availability: BarberAvailabilitySummary[]
}

interface BulkOperationResult {
  success: boolean
  total_barbers: number
  successful_applications: number
  failed_applications: number
  errors: string[]
  details: Array<{
    barber_id: number
    status: string
    records_created?: number
    error?: string
  }>
}

// Organization Availability Template Management
export const availabilityAPI = {
  
  // Get organization's availability template
  async getOrganizationTemplate(organizationId: number): Promise<OrganizationAvailabilityTemplate> {
    const response = await apiClient.request(`/api/v2/organizations/${organizationId}/availability-template`)
    return response
  },
  
  // Update organization's availability template
  async updateOrganizationTemplate(
    organizationId: number, 
    templateData: {
      default_schedule: AvailabilitySchedule
      inheritance_policy?: string
      barber_constraints?: any
      requires_approval?: boolean
      apply_to_all_barbers?: boolean
      override_existing_barber_hours?: boolean
    }
  ): Promise<{
    success: boolean
    message: string
    organization_id: number
    effective_hours: any
    applied_to_barbers: boolean
    application_results?: BulkOperationResult
  }> {
    const response = await apiClient.request(
      `/api/v2/organizations/${organizationId}/availability-template`,
      {
        method: 'PUT',
        body: templateData
      }
    )
    return response
  },
  
  // Apply template to specific barbers
  async applyTemplateToBarbers(
    organizationId: number,
    barberIds: number[],
    overrideExisting: boolean = false
  ): Promise<{
    success: boolean
    message: string
    organization_id: number
    results: BulkOperationResult
  }> {
    const response = await apiClient.request(
      `/api/v2/organizations/${organizationId}/apply-template`,
      {
        method: 'POST',
        body: {
          barber_ids: barberIds,
          override_existing: overrideExisting
        }
      }
    )
    return response
  },
  
  // Get staff availability overview
  async getStaffAvailabilityOverview(
    organizationId: number,
    includeSourceMetadata: boolean = false
  ): Promise<StaffAvailabilityOverview> {
    const queryParams = includeSourceMetadata ? '?include_source_metadata=true' : ''
    const response = await apiClient.request(
      `/api/v2/organizations/${organizationId}/staff-availability${queryParams}`
    )
    return response
  },
  
  // Individual Barber Availability (using existing endpoints)
  async getBarberAvailability(barberId: number, dayOfWeek?: number): Promise<any[]> {
    const queryParams = dayOfWeek !== undefined ? `?day_of_week=${dayOfWeek}` : ''
    const response = await apiClient.request(`/api/v2/barber-availability/availability/${barberId}${queryParams}`)
    return response
  },
  
  async updateBarberAvailability(availabilityId: number, availabilityData: {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
    organization_override?: boolean
    source?: string
  }): Promise<any> {
    const response = await apiClient.request(
      `/api/v2/barber-availability/availability/${availabilityId}`,
      {
        method: 'PUT',
        body: availabilityData
      }
    )
    return response
  },
  
  async createBarberAvailability(barberId: number, availabilityData: {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
    organization_override?: boolean
    source?: string
  }): Promise<any> {
    const response = await apiClient.request(
      `/api/v2/barber-availability/availability/${barberId}`,
      {
        method: 'POST',
        body: availabilityData
      }
    )
    return response
  },
  
  // Get comprehensive schedule with inheritance resolution
  async getBarberSchedule(barberId: number, includeSourceMetadata: boolean = false): Promise<{
    regular_availability: any[]
    time_off: any[]
    special_availability: any[]
    effective_schedule?: any[]
  }> {
    const response = await apiClient.request(`/api/v2/barber-availability/schedule/${barberId}`)
    
    // If source metadata is requested, also get the resolved effective availability
    if (includeSourceMetadata) {
      try {
        // This would use the new service endpoint we created
        const effectiveResponse = await apiClient.request(
          `/api/v2/barber-availability/effective/${barberId}?include_source_metadata=true`
        )
        response.effective_schedule = effectiveResponse
      } catch (error) {
        console.warn('Could not fetch effective schedule with metadata:', error)
      }
    }
    
    return response
  },
  
  // Time off management
  async getBarberTimeOff(barberId: number): Promise<any[]> {
    const response = await apiClient.request(`/api/v2/barber-availability/time-off/${barberId}`)
    return response
  },
  
  async createBarberTimeOff(barberId: number, timeOffData: {
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    reason?: string
  }): Promise<any> {
    const response = await apiClient.request(
      `/api/v2/barber-availability/time-off/${barberId}`,
      {
        method: 'POST',
        body: timeOffData
      }
    )
    return response
  },
  
  // Special availability management  
  async getBarberSpecialAvailability(barberId: number): Promise<any[]> {
    const response = await apiClient.request(`/api/v2/barber-availability/special/${barberId}`)
    return response
  },
  
  async createBarberSpecialAvailability(barberId: number, specialData: {
    date: string
    start_time: string
    end_time: string
    availability_type: string
    notes?: string
  }): Promise<any> {
    const response = await apiClient.request(
      `/api/v2/barber-availability/special/${barberId}`,
      {
        method: 'POST',
        body: specialData
      }
    )
    return response
  }
}

export default availabilityAPI