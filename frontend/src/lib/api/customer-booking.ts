/**
 * Customer Booking API service
 */
import apiClient from './client'
import { smartStorage } from '../utils/storage'

export interface CustomerAppointment {
  id: number
  barber_id: number
  barber_name: string
  service_id: number
  service_name: string
  appointment_date: string
  appointment_time: string
  location_id: number
  location_name: string
  location_address: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  total_amount?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface AppointmentFilter {
  status?: string
  upcoming_only?: boolean
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface AppointmentListResponse {
  appointments: CustomerAppointment[]
  total: number
  page: number
  limit: number
}

export interface CustomerStats {
  totalAppointments: number
  upcomingAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  totalSpent: number
  favoriteBarber: string
  favoriteService: string
}

export interface RescheduleRequest {
  appointment_date: string
  appointment_time: string
  reason?: string
}

export interface CancelRequest {
  reason?: string
}

export const customerBookingService = {
  /**
   * Get customer appointments
   */
  async getAppointments(filter: AppointmentFilter = {}): Promise<AppointmentListResponse> {
    const token = smartStorage.getItem('customer_access_token')
    const params = new URLSearchParams()

    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    const response = await apiClient.get<AppointmentListResponse>(
      `/customer/appointments?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data
  },

  /**
   * Get specific appointment details
   */
  async getAppointment(appointmentId: number): Promise<CustomerAppointment> {
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.get<CustomerAppointment>(
      `/customer/appointments/${appointmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data
  },

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<CustomerStats> {
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.get<CustomerStats>(
      '/customer/stats',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data
  },

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(appointmentId: number, rescheduleData: RescheduleRequest): Promise<CustomerAppointment> {
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.put<CustomerAppointment>(
      `/customer/appointments/${appointmentId}/reschedule`,
      rescheduleData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data
  },

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: number, cancelData: CancelRequest = {}): Promise<void> {
    const token = smartStorage.getItem('customer_access_token')
    await apiClient.put(
      `/customer/appointments/${appointmentId}/cancel`,
      cancelData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
  },

  /**
   * Get available time slots for rescheduling
   */
  async getAvailableSlots(appointmentId: number, date: string): Promise<string[]> {
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.get<{ slots: string[] }>(
      `/customer/appointments/${appointmentId}/available-slots?date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data.slots
  },

  /**
   * Add review for completed appointment
   */
  async addReview(appointmentId: number, reviewData: { rating: number; comment?: string }): Promise<void> {
    const token = smartStorage.getItem('customer_access_token')
    await apiClient.post(
      `/customer/appointments/${appointmentId}/review`,
      reviewData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
  },
}
