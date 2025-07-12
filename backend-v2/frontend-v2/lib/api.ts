// Basic API types and functions for booking system

export interface User {
  id: string
  name: string
  first_name?: string
  email: string
  role: 'barber' | 'manager' | 'client'
  unified_role?: string
  onboardingCompleted?: boolean
  onboarding_status?: {
    completed_steps: string[]
    current_step?: string
  }
}

export interface TimeSlot {
  time: string;
  available: boolean;
  is_next_available?: boolean;
}

export interface SlotsResponse {
  slots: TimeSlot[];
  next_available?: NextAvailableSlot;
}

export interface NextAvailableSlot {
  date: string;
  time: string;
}

export interface GuestInformation {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface GuestBookingCreate {
  service: string;
  date: string;
  time: string;
  guest_info: GuestInformation;
}

export interface GuestQuickBookingCreate {
  service: string;
  guest_info: GuestInformation;
}

export interface GuestBookingResponse {
  id: number;
  service: string;
  date: string;
  time: string;
  status: string;
}

export interface AppointmentCreate {
  service: string;
  date: string;
  time: string;
}

export interface BookingResponse {
  id: number;
  service: string;
  date: string;
  time: string;
  status: string;
  client_name?: string;
}

// Mock API functions
export const appointmentsAPI = {
  getSlots: async (date: string, service: string): Promise<SlotsResponse> => {
    // Mock slots for demo
    return {
      slots: [
        { time: '09:00', available: true },
        { time: '09:30', available: true },
        { time: '10:00', available: false },
        { time: '10:30', available: true },
        { time: '11:00', available: true },
        { time: '14:00', available: true },
        { time: '14:30', available: true },
      ]
    };
  }
};

export const getMyBookings = async (): Promise<BookingResponse[]> => {
  return [];
};

export const getProfile = async (): Promise<User> => {
  // Mock user profile for demo
  return {
    id: '1',
    name: 'Demo User',
    first_name: 'Demo',
    email: 'demo@bookedbarber.com',
    role: 'barber',
    unified_role: 'INDIVIDUAL_BARBER',
    onboardingCompleted: false,
    onboarding_status: {
      completed_steps: [],
      current_step: 'profile_setup'
    }
  };
};

export const getNextAvailableSlot = async (service: string): Promise<NextAvailableSlot> => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    date: tomorrow.toISOString().split('T')[0],
    time: '09:00'
  };
};

export const quickBooking = async (data: any) => {
  return { id: 1, ...data };
};

export const createGuestBooking = async (data: GuestBookingCreate): Promise<GuestBookingResponse> => {
  return {
    id: Math.floor(Math.random() * 1000),
    service: data.service,
    date: data.date,
    time: data.time,
    status: 'confirmed'
  };
};

export const createGuestQuickBooking = async (data: GuestQuickBookingCreate): Promise<GuestBookingResponse> => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    id: Math.floor(Math.random() * 1000),
    service: data.service,
    date: tomorrow.toISOString().split('T')[0],
    time: '09:00',
    status: 'confirmed'
  };
};

// Payment API functions
export interface PaymentIntentRequest {
  booking_id: number;
}

export interface PaymentIntentResponse {
  client_secret?: string;
  payment_intent_id?: string;
}

export interface ConfirmPaymentRequest {
  payment_intent_id: string;
  booking_id: number;
}

export const createPaymentIntent = async (data: PaymentIntentRequest): Promise<PaymentIntentResponse> => {
  // Mock payment intent for demo
  return {
    client_secret: 'pi_test_' + Math.random().toString(36).substr(2, 9),
    payment_intent_id: 'pi_' + Math.random().toString(36).substr(2, 9)
  };
};

export const confirmPayment = async (data: ConfirmPaymentRequest): Promise<void> => {
  // Mock payment confirmation for demo
  console.log('Payment confirmed:', data);
  return;
};

// Onboarding API functions
export const updateOnboardingStatus = async (status: string): Promise<void> => {
  // Mock onboarding status update for demo
  console.log('Onboarding status updated:', status);
  return;
};