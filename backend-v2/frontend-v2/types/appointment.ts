export interface Appointment {
  id: number
  barber_id: number
  client_id?: number
  service_id?: number
  start_time: string
  end_time: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  total_price: number
  notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  barber?: {
    id: number
    name: string
    email: string
    location?: string
  }
  client?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
  service?: {
    id: number
    name: string
    description?: string
    duration: number
    price: number
  }
}

export interface AppointmentCreate {
  barber_id: number
  client_id?: number
  service_id?: number
  start_time: string
  end_time: string
  status?: 'confirmed' | 'pending'
  total_price: number
  notes?: string
}

export interface AppointmentUpdate {
  start_time?: string
  end_time?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  notes?: string
}