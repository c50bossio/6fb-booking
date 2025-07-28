/**
 * Comprehensive Barber Availability Management Service
 * Supports Six Figure Barber methodology for efficient business operations
 */

import { api } from '@/lib/api';

// Types and Interfaces
export interface BarberAvailability {
  id: number;
  barber_id: number;
  day_of_week: number; // 0=Monday, 6=Sunday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeOffRequest {
  id: number;
  barber_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM format, null for full day
  end_time?: string; // HH:MM format, null for full day
  reason?: string;
  notes?: string;
  status: 'requested' | 'approved' | 'denied' | 'cancelled';
  approved_by_id?: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialAvailability {
  id: number;
  barber_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  availability_type: 'available' | 'unavailable';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BarberSchedule {
  barber_id: number;
  start_date: string;
  end_date: string;
  appointments: AppointmentSummary[];
  regular_availability: BarberAvailability[];
  time_off: TimeOffRequest[];
  special_availability: SpecialAvailability[];
}

export interface AppointmentSummary {
  id: number;
  start_time: string;
  duration_minutes: number;
  service_name: string;
  status: string;
  client_id: number;
  buffer_time_before?: number;
  buffer_time_after?: number;
}

export interface AvailabilityCheck {
  barber_id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface BulkAvailabilityUpdate {
  barber_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface UtilizationAnalytics {
  barber_id: number;
  period: string;
  total_available_hours: number;
  total_booked_hours: number;
  utilization_rate: number;
  peak_hours: string[];
  low_demand_hours: string[];
  revenue_per_hour: number;
  client_satisfaction_rate: number;
}

export interface CapacitySettings {
  barber_id: number;
  max_concurrent_appointments: number;
  service_specific_limits?: Record<string, number>;
  peak_hour_multiplier?: number;
}

// API Service Class
export class BarberAvailabilityService {
  private baseUrl = '/api/v2/barber-availability';

  // Regular Availability Management
  async getBarberAvailability(barberId: number, dayOfWeek?: number): Promise<BarberAvailability[]> {
    const params = new URLSearchParams();
    if (dayOfWeek !== undefined) {
      params.append('day_of_week', dayOfWeek.toString());
    }
    
    const response = await api.get(`${this.baseUrl}/availability/${barberId}?${params.toString()}`);
    return response.data;
  }

  async createBarberAvailability(
    barberId: number,
    availabilityData: Omit<BarberAvailability, 'id' | 'barber_id' | 'created_at' | 'updated_at'>
  ): Promise<BarberAvailability> {
    const response = await api.post(`${this.baseUrl}/availability/${barberId}`, availabilityData);
    return response.data;
  }

  async updateBarberAvailability(
    availabilityId: number,
    updateData: Partial<Omit<BarberAvailability, 'id' | 'barber_id' | 'created_at' | 'updated_at'>>
  ): Promise<BarberAvailability> {
    const response = await api.put(`${this.baseUrl}/availability/${availabilityId}`, updateData);
    return response.data;
  }

  async deleteBarberAvailability(availabilityId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/availability/${availabilityId}`);
  }

  // Bulk Operations
  async bulkUpdateAvailability(updates: BulkAvailabilityUpdate[]): Promise<BarberAvailability[]> {
    const results: BarberAvailability[] = [];
    
    for (const update of updates) {
      try {
        const existing = await this.getBarberAvailability(update.barber_id, update.day_of_week);
        const existingRecord = existing.find(a => a.day_of_week === update.day_of_week);
        
        if (existingRecord) {
          const updated = await this.updateBarberAvailability(existingRecord.id, {
            start_time: update.start_time,
            end_time: update.end_time
          });
          results.push(updated);
        } else {
          const created = await this.createBarberAvailability(update.barber_id, {
            day_of_week: update.day_of_week,
            start_time: update.start_time,
            end_time: update.end_time,
            is_active: true
          });
          results.push(created);
        }
      } catch (error) {
        console.error(`Failed to update availability for barber ${update.barber_id}, day ${update.day_of_week}:`, error);
      }
    }
    
    return results;
  }

  async cloneWeeklySchedule(
    sourceBarberId: number,
    targetBarberIds: number[],
    overwriteExisting: boolean = false
  ): Promise<BarberAvailability[]> {
    const sourceSchedule = await this.getBarberAvailability(sourceBarberId);
    const results: BarberAvailability[] = [];
    
    for (const targetBarberId of targetBarberIds) {
      for (const availability of sourceSchedule) {
        try {
          if (overwriteExisting) {
            const existing = await this.getBarberAvailability(targetBarberId, availability.day_of_week);
            const existingRecord = existing.find(a => a.day_of_week === availability.day_of_week);
            
            if (existingRecord) {
              const updated = await this.updateBarberAvailability(existingRecord.id, {
                start_time: availability.start_time,
                end_time: availability.end_time,
                is_active: availability.is_active
              });
              results.push(updated);
              continue;
            }
          }
          
          const created = await this.createBarberAvailability(targetBarberId, {
            day_of_week: availability.day_of_week,
            start_time: availability.start_time,
            end_time: availability.end_time,
            is_active: availability.is_active
          });
          results.push(created);
        } catch (error) {
          console.error(`Failed to clone schedule to barber ${targetBarberId}:`, error);
        }
      }
    }
    
    return results;
  }

  // Time Off Management
  async getTimeOffRequests(
    barberId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TimeOffRequest[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`${this.baseUrl}/time-off/${barberId}?${params.toString()}`);
    return response.data;
  }

  async createTimeOffRequest(
    barberId: number,
    timeOffData: Omit<TimeOffRequest, 'id' | 'barber_id' | 'status' | 'approved_by_id' | 'created_at' | 'updated_at'>
  ): Promise<TimeOffRequest> {
    const response = await api.post(`${this.baseUrl}/time-off/${barberId}`, timeOffData);
    return response.data;
  }

  async approveTimeOffRequest(
    requestId: number,
    approverId: number,
    notes?: string
  ): Promise<TimeOffRequest> {
    const response = await api.put(`${this.baseUrl}/time-off/${requestId}/approve`, {
      approved_by_id: approverId,
      notes
    });
    return response.data;
  }

  async denyTimeOffRequest(
    requestId: number,
    approverId: number,
    reason?: string
  ): Promise<TimeOffRequest> {
    const response = await api.put(`${this.baseUrl}/time-off/${requestId}/deny`, {
      denied_by_id: approverId,
      denial_reason: reason
    });
    return response.data;
  }

  // Special Availability
  async getSpecialAvailability(barberId: number, date?: string): Promise<SpecialAvailability[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    
    const response = await api.get(`${this.baseUrl}/special/${barberId}?${params.toString()}`);
    return response.data;
  }

  async createSpecialAvailability(
    barberId: number,
    specialData: Omit<SpecialAvailability, 'id' | 'barber_id' | 'created_at' | 'updated_at'>
  ): Promise<SpecialAvailability> {
    const response = await api.post(`${this.baseUrl}/special/${barberId}`, specialData);
    return response.data;
  }

  // Availability Checking
  async checkBarberAvailability(
    barberId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number
  ): Promise<AvailabilityCheck> {
    const params = new URLSearchParams({
      check_date: date,
      start_time: startTime,
      end_time: endTime
    });
    
    if (excludeAppointmentId) {
      params.append('exclude_appointment_id', excludeAppointmentId.toString());
    }
    
    const response = await api.get(`${this.baseUrl}/check/${barberId}?${params.toString()}`);
    return response.data;
  }

  async getAvailableBarbers(
    date: string,
    startTime: string,
    endTime: string,
    serviceId?: number
  ): Promise<any> {
    const params = new URLSearchParams({
      check_date: date,
      start_time: startTime,
      end_time: endTime
    });
    
    if (serviceId) {
      params.append('service_id', serviceId.toString());
    }
    
    const response = await api.get(`${this.baseUrl}/available-barbers?${params.toString()}`);
    return response.data;
  }

  // Comprehensive Schedule
  async getBarberSchedule(
    barberId: number,
    startDate: string,
    endDate: string,
    timezone: string = 'UTC'
  ): Promise<BarberSchedule> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      timezone
    });
    
    const response = await api.get(`${this.baseUrl}/schedule/${barberId}?${params.toString()}`);
    return response.data;
  }

  // Analytics and Utilization
  async getUtilizationAnalytics(
    barberId: number,
    period: 'week' | 'month' | 'quarter',
    startDate?: string,
    endDate?: string
  ): Promise<UtilizationAnalytics> {
    // This would be implemented with a new API endpoint
    const params = new URLSearchParams({ period });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/api/v2/analytics/barber-utilization/${barberId}?${params.toString()}`);
    return response.data;
  }

  async getAvailabilityPatterns(barberId: number): Promise<any> {
    // Analyze availability patterns for optimization recommendations
    const response = await api.get(`/api/v2/analytics/availability-patterns/${barberId}`);
    return response.data;
  }

  // Capacity Management
  async getCapacitySettings(barberId: number): Promise<CapacitySettings> {
    const response = await api.get(`/api/v2/barber-capacity/${barberId}`);
    return response.data;
  }

  async updateCapacitySettings(
    barberId: number,
    settings: Omit<CapacitySettings, 'barber_id'>
  ): Promise<CapacitySettings> {
    const response = await api.put(`/api/v2/barber-capacity/${barberId}`, settings);
    return response.data;
  }

  // Manager Override System
  async createManagerOverride(
    barberId: number,
    overrideData: {
      date: string;
      start_time: string;
      end_time: string;
      override_type: 'force_available' | 'force_unavailable' | 'capacity_override';
      reason: string;
      notes?: string;
      manager_id: number;
    }
  ): Promise<any> {
    const response = await api.post(`/api/v2/manager-overrides/${barberId}`, overrideData);
    return response.data;
  }

  // Conflict Detection Integration
  async detectScheduleConflicts(
    barberId: number,
    proposedAvailability: BarberAvailability[]
  ): Promise<any[]> {
    const response = await api.post(`/api/v2/availability-conflicts/${barberId}`, {
      proposed_availability: proposedAvailability
    });
    return response.data;
  }

  // Revenue Optimization (Six Figure Barber methodology)
  async getRevenueOptimizedSchedule(
    barberId: number,
    targetRevenue: number,
    constraints?: {
      max_hours_per_day?: number;
      preferred_days?: number[];
      break_duration?: number;
    }
  ): Promise<any> {
    const response = await api.post(`/api/v2/revenue-optimization/schedule/${barberId}`, {
      target_revenue: targetRevenue,
      constraints
    });
    return response.data;
  }

  // Template Management
  async saveScheduleTemplate(
    name: string,
    description: string,
    availability: BarberAvailability[]
  ): Promise<any> {
    const response = await api.post('/api/v2/schedule-templates', {
      name,
      description,
      availability_template: availability
    });
    return response.data;
  }

  async getScheduleTemplates(): Promise<any[]> {
    const response = await api.get('/api/v2/schedule-templates');
    return response.data;
  }

  async applyScheduleTemplate(
    templateId: number,
    barberIds: number[],
    overwriteExisting: boolean = false
  ): Promise<any> {
    const response = await api.post(`/api/v2/schedule-templates/${templateId}/apply`, {
      barber_ids: barberIds,
      overwrite_existing: overwriteExisting
    });
    return response.data;
  }
}

// Export singleton instance
export const barberAvailabilityService = new BarberAvailabilityService();