import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let bookingDuration = new Trend('booking_duration');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 50 },   // Ramp down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
    booking_duration: ['p(95)<5000'],  // 95% of booking flows must complete below 5s
  },
};

const BASE_URL = __ENV.API_URL || 'https://staging-api.bookedbarber.com';

// Test data
const TEST_USERS = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  { email: 'test3@example.com', password: 'Test123!@#' },
];

const TEST_BARBERS = [
  'barber1@example.com',
  'barber2@example.com',
  'barber3@example.com',
];

// Utility functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateTestEmail() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  return `loadtest-${timestamp}-${randomId}@example.com`;
}

// Authentication flow
function authenticate() {
  const user = randomChoice(TEST_USERS);
  
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => JSON.parse(r.body).access_token !== undefined,
  });

  errorRate.add(!success);

  if (success) {
    return JSON.parse(loginResponse.body).access_token;
  }
  return null;
}

// Get available time slots
function getAvailableSlots(token, barberId) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const response = http.get(
    `${BASE_URL}/api/v1/appointments/availability?barber_id=${barberId}&date=${dateStr}`,
    {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const success = check(response, {
    'availability check successful': (r) => r.status === 200,
    'has available slots': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.available_slots && data.available_slots.length > 0;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    const data = JSON.parse(response.body);
    return data.available_slots;
  }
  return [];
}

// Create booking
function createBooking(token, barberId, slot) {
  const bookingStart = Date.now();
  
  const bookingData = {
    barber_id: barberId,
    service_id: 1, // Assume service ID 1 exists
    appointment_datetime: slot.datetime,
    client_name: 'Load Test Client',
    client_email: generateTestEmail(),
    client_phone: '+1234567890',
    notes: 'Load test booking',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/appointments`,
    JSON.stringify(bookingData),
    {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const bookingEnd = Date.now();
  bookingDuration.add(bookingEnd - bookingStart);

  const success = check(response, {
    'booking creation successful': (r) => r.status === 201,
    'booking has ID': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    return JSON.parse(response.body);
  }
  return null;
}

// Get booking details
function getBookingDetails(token, bookingId) {
  const response = http.get(
    `${BASE_URL}/api/v1/appointments/${bookingId}`,
    {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const success = check(response, {
    'get booking successful': (r) => r.status === 200,
    'booking details correct': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id === bookingId;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  return success;
}

// Main test scenario
export default function () {
  // Authenticate user
  const token = authenticate();
  if (!token) {
    console.log('Authentication failed, skipping booking flow');
    return;
  }

  sleep(1);

  // Get random barber
  const barberId = Math.floor(Math.random() * 3) + 1; // Assume barber IDs 1-3 exist

  // Get available slots
  const slots = getAvailableSlots(token, barberId);
  if (slots.length === 0) {
    console.log('No available slots, skipping booking');
    return;
  }

  sleep(1);

  // Create booking
  const booking = createBooking(token, barberId, randomChoice(slots));
  if (!booking) {
    console.log('Booking creation failed');
    return;
  }

  sleep(1);

  // Verify booking
  getBookingDetails(token, booking.id);

  sleep(2);
}

// Setup function (runs once before all VUs)
export function setup() {
  console.log('Starting booking flow load test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test will simulate booking appointments under load`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown function (runs once after all VUs complete)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}