/**
 * Appointments API service
 */
import apiClient from './client'
import type { Appointment } from './client'

interface AppointmentCreate {
  barber_id: number
  client_id?: number
  client_name: string
  client_email?: string
  client_phone?: string
  appointment_date: string
  appointment_time: string
  service_id?: number
  service_name: string
  service_duration: number
  service_price: number
  notes?: string
}

interface AppointmentUpdate {
  appointment_date?: string
  appointment_time?: string
  status?: string
  service_revenue?: number
  tip_amount?: number
  product_revenue?: number
  notes?: string
}

interface AppointmentFilter {
  skip?: number
  limit?: number
  barber_id?: number
  location_id?: number
  status?: string
  start_date?: string
  end_date?: string
}

interface BarberAvailability {
  barber_id: number
  date: string
  slots: Array<{
    time: string
    available: boolean
  }>
  total_slots: number
  available_slots: number
}

export const appointmentsService = {
  /**
   * Get list of appointments
   */
  async getAppointments(filters?: AppointmentFilter): Promise<Appointment[]> {
    const params = new URLSearchParams()
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.status) params.append('status', filters.status)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    const response = await apiClient.get<Appointment[]>(`/appointments?${params.toString()}`)
    return response.data
  },

  /**
   * Get specific appointment
   */
  async getAppointment(appointmentId: number): Promise<Appointment> {
    const response = await apiClient.get<Appointment>(`/appointments/${appointmentId}`)
    return response.data
  },

  /**
   * Create new appointment
   */
  async createAppointment(data: AppointmentCreate): Promise<Appointment> {
    const response = await apiClient.post<Appointment>('/appointments', data)
    return response.data
  },

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: number, data: AppointmentUpdate): Promise<Appointment> {
    const response = await apiClient.put<Appointment>(`/appointments/${appointmentId}`, data)
    return response.data
  },

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: number): Promise<void> {
    await apiClient.delete(`/appointments/${appointmentId}`)
  },

  /**
   * Get barber availability
   */
  async getBarberAvailability(barberId: number, date: string): Promise<BarberAvailability> {
    const response = await apiClient.get<BarberAvailability>(
      `/appointments/availability/${barberId}`,
      { params: { date } }
    )
    return response.data
  },

  /**
   * Quick status update helpers
   */
  async confirmAppointment(appointmentId: number): Promise<Appointment> {
    return this.updateAppointment(appointmentId, { status: 'confirmed' })
  },

  async completeAppointment(
    appointmentId: number,
    data: {
      service_revenue?: number
      tip_amount?: number
      product_revenue?: number
    }
  ): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: 'completed',
      ...data
    })
  },

  async markNoShow(appointmentId: number): Promise<Appointment> {
    return this.updateAppointment(appointmentId, { status: 'no_show' })
  },
}
