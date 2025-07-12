// Basic API types and functions for booking system

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API Request types
export interface FetchAPIOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export interface APIError {
  message: string;
  status?: number;
  code?: string;
}

// Custom error class for API errors
export class APIException extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'APIException';
    this.status = status;
    this.code = code;
  }
}

// Main fetchAPI function
export async function fetchAPI<T = any>(
  endpoint: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    query
  } = options;

  // Build the full URL
  let url = `${API_BASE_URL}${endpoint}`;
  
  // Add query parameters if provided
  if (query) {
    const queryParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Prepare headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Prepare request configuration
  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    // Make the request
    const response = await fetch(url, requestConfig);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode = response.status.toString();

      // Try to parse error details from response body
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.code) {
          errorCode = errorData.code;
        }
      } catch {
        // If we can't parse the error body, use the default message
      }

      throw new APIException(errorMessage, response.status, errorCode);
    }

    // Handle empty responses (like DELETE operations)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // For non-JSON responses, return the text or null
      const text = await response.text();
      return (text || null) as T;
    }

    // Parse and return JSON response
    const data = await response.json();
    return data as T;

  } catch (error) {
    // Handle network errors and other exceptions
    if (error instanceof APIException) {
      throw error;
    }

    // Handle fetch errors (network issues, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIException(
        'Network error: Unable to connect to the server. Please check your connection.',
        0,
        'NETWORK_ERROR'
      );
    }

    // Handle other errors
    throw new APIException(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  }
}

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
  primary_organization_id?: number
  subscription_status?: 'trial' | 'active' | 'expired' | 'canceled'
}

export interface TrialStatus {
  trial_active: boolean
  days_remaining: number
  chairs_count: number
  monthly_cost: number
  subscription_status: 'trial' | 'active' | 'expired' | 'canceled'
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
    },
    primary_organization_id: 1,
    subscription_status: 'trial'
  };
};

export const getTrialStatus = async (organizationId: number): Promise<TrialStatus> => {
  // Mock trial status - in production this would fetch from backend
  return {
    trial_active: true,
    days_remaining: 14,
    chairs_count: 1,
    monthly_cost: 19,
    subscription_status: 'trial'
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