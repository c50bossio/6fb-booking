export interface Appointment {
  id: number
  client_name?: string
  client_email?: string
  client_phone?: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  service_name?: string
  service_id?: number
  barber_id?: number
  barber_name?: string
  total_amount?: number
  total_price?: number // Alternative property name for compatibility
  notes?: string
  created_at?: string
  updated_at?: string
  // Optional nested objects for enhanced appointment data
  barber?: {
    id: number
    name: string
    email: string
    location: string
  }
  client?: {
    id: number
    name: string
    email: string
    phone: string
  }
  service?: {
    id: number
    name: string
    duration: number
    price: number
  }
}

export interface CreateAppointmentRequest {
  client_name: string
  client_email: string
  client_phone?: string
  start_time: string
  end_time: string
  service_id: number
  barber_id?: number
  notes?: string
}

export interface UpdateAppointmentRequest {
  client_name?: string
  client_email?: string
  client_phone?: string
  start_time?: string
  end_time?: string
  service_id?: number
  barber_id?: number
  status?: string
  notes?: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'