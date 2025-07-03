/**
 * Test Configuration for End-to-End Appointment Testing
 */

export const TEST_CONFIG = {
  // Environment URLs
  FRONTEND_URL: process.env.E2E_FRONTEND_URL || 'http://localhost:3001',
  BACKEND_URL: process.env.E2E_BACKEND_URL || 'http://localhost:8000',
  
  // Test user credentials
  CUSTOMER: {
    email: 'test.customer@bookedbarber.com',
    password: 'testpass123',
    name: 'Test Customer',
    phone: '+1234567890'
  },
  
  BARBER: {
    email: 'test.barber@bookedbarber.com', 
    password: 'barberpass123',
    name: 'Test Barber'
  },
  
  ADMIN: {
    email: 'admin@bookedbarber.com',
    password: 'adminpass123'
  },

  // Payment settings
  PAYMENT: {
    testAmount: 1.00, // $1.00 for live testing
    testCard: {
      number: '4242424242424242',
      expiry: '12/25',
      cvc: '123',
      postal: '12345'
    },
    // Live test card for international testing
    internationalCard: {
      number: '4000000000000002',
      expiry: '12/25', 
      cvc: '123',
      postal: '12345'
    }
  },

  // Test appointment data
  APPOINTMENT: {
    service: 'Haircut',
    duration: 30, // minutes
    notes: 'E2E test appointment - safe to delete',
    futureDate: 3 // days from now
  },

  // Timeouts
  TIMEOUTS: {
    short: 5000,   // 5 seconds
    medium: 15000, // 15 seconds  
    long: 30000,   // 30 seconds
    payment: 45000 // 45 seconds for payment processing
  },

  // Screenshot settings
  SCREENSHOTS: {
    path: './test-results/screenshots',
    fullPage: true,
    quality: 90
  },

  // Feature flags for testing
  FEATURES: {
    testLivePayments: process.env.E2E_LIVE_PAYMENTS === 'true',
    testGoogleCalendar: process.env.E2E_GOOGLE_CALENDAR === 'true',
    testNotifications: process.env.E2E_NOTIFICATIONS === 'true',
    testWebhooks: process.env.E2E_WEBHOOKS === 'true'
  }
};

// Calendar view selectors
export const SELECTORS = {
  // Login & Auth
  loginForm: '[data-testid="login-form"]',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]', 
  loginButton: 'button[type="submit"]',
  
  // Booking flow
  serviceSelection: '[data-testid="service-selection"]',
  serviceCard: '[data-testid="service-card"]',
  dateSelector: '[data-testid="date-selector"]',
  timeSelector: '[data-testid="time-selector"]', 
  customerForm: '[data-testid="customer-form"]',
  paymentForm: '[data-testid="payment-form"]',
  
  // Stripe elements
  stripeCard: '#stripe-card-element',
  stripeCardFrame: '#stripe-card-element iframe',
  paymentButton: 'button:has-text("Pay Now")',
  paymentSuccess: '[data-testid="payment-success"]',
  
  // Calendar views
  monthlyCalendar: '[data-testid="monthly-calendar"]',
  weeklyCalendar: '[data-testid="weekly-calendar"]',
  dailyCalendar: '[data-testid="daily-calendar"]',
  
  // Calendar navigation
  prevButton: '[data-testid="calendar-prev"]',
  nextButton: '[data-testid="calendar-next"]',
  todayButton: '[data-testid="calendar-today"]',
  viewToggle: '[data-testid="view-toggle"]',
  
  // Appointments
  appointment: '[data-testid="appointment"]',
  appointmentModal: '[data-testid="appointment-modal"]',
  appointmentDetails: '[data-testid="appointment-details"]',
  
  // Status indicators
  loadingSpinner: '[data-testid="loading"]',
  errorMessage: '[data-testid="error"]',
  successMessage: '[data-testid="success"]'
};

// Test data generators
export const generateTestData = () => {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + TEST_CONFIG.APPOINTMENT.futureDate);
  
  return {
    appointment: {
      date: futureDate.toISOString().split('T')[0],
      time: '14:00', // 2:00 PM
      service: TEST_CONFIG.APPOINTMENT.service,
      notes: `${TEST_CONFIG.APPOINTMENT.notes} - ${now.toISOString()}`
    },
    customer: {
      ...TEST_CONFIG.CUSTOMER,
      email: `test.${Date.now()}@bookedbarber.com` // Unique email
    }
  };
};

// Validation helpers
export const validateAppointmentData = (appointment: any) => {
  const required = ['id', 'service_name', 'customer_name', 'appointment_date', 'appointment_time', 'status'];
  return required.every(field => appointment[field] !== undefined);
};

export const validatePaymentData = (payment: any) => {
  const required = ['id', 'amount', 'status', 'stripe_payment_intent_id'];
  return required.every(field => payment[field] !== undefined);
};