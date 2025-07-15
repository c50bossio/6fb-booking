import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let requestCount = new Counter('total_requests');

// Test configuration
export let options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '3m', target: 100 },  // Ramp down to 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.01'],     // Error rate must be below 1%
    response_time: ['p(95)<1000'],      // 95% of API calls must respond below 1s
  },
};

const BASE_URL = __ENV.API_URL || 'https://staging-api.bookedbarber.com';

// Test endpoints with different weights (simulating real usage patterns)
const ENDPOINTS = [
  // High frequency endpoints (70% of traffic)
  { path: '/health', method: 'GET', weight: 20, auth: false },
  { path: '/api/v1/services', method: 'GET', weight: 15, auth: false },
  { path: '/api/v1/barbers', method: 'GET', weight: 15, auth: false },
  { path: '/api/v1/appointments/availability', method: 'GET', weight: 20, auth: false },
  
  // Medium frequency endpoints (20% of traffic)
  { path: '/api/v1/auth/login', method: 'POST', weight: 8, auth: false },
  { path: '/api/v1/appointments', method: 'GET', weight: 7, auth: true },
  { path: '/api/v1/users/profile', method: 'GET', weight: 5, auth: true },
  
  // Low frequency endpoints (10% of traffic)
  { path: '/api/v1/appointments', method: 'POST', weight: 3, auth: true },
  { path: '/api/v1/payments/create-intent', method: 'POST', weight: 2, auth: true },
  { path: '/api/v1/analytics/dashboard', method: 'GET', weight: 2, auth: true },
  { path: '/api/v1/users/settings', method: 'GET', weight: 2, auth: true },
  { path: '/api/v1/notifications/preferences', method: 'GET', weight: 1, auth: true },
];

// Build weighted endpoint array
function buildWeightedEndpoints() {
  let weighted = [];
  ENDPOINTS.forEach(endpoint => {
    for (let i = 0; i < endpoint.weight; i++) {
      weighted.push(endpoint);
    }
  });
  return weighted;
}

const WEIGHTED_ENDPOINTS = buildWeightedEndpoints();

// Test user credentials
const TEST_USERS = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  { email: 'test3@example.com', password: 'Test123!@#' },
];

// Authentication cache (to avoid re-authenticating on every request)
let authTokens = {};

function getAuthToken(userIndex) {
  if (authTokens[userIndex] && authTokens[userIndex].expires > Date.now()) {
    return authTokens[userIndex].token;
  }

  const user = TEST_USERS[userIndex % TEST_USERS.length];
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 200) {
    const data = JSON.parse(response.body);
    authTokens[userIndex] = {
      token: data.access_token,
      expires: Date.now() + (50 * 60 * 1000), // 50 minutes
    };
    return data.access_token;
  }

  return null;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function makeRequest(endpoint, token) {
  const startTime = Date.now();
  let response;
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Generate appropriate request data
  let requestData = null;
  if (endpoint.method === 'POST') {
    switch (endpoint.path) {
      case '/api/v1/auth/login':
        const user = randomChoice(TEST_USERS);
        requestData = { email: user.email, password: user.password };
        break;
      case '/api/v1/appointments':
        requestData = {
          barber_id: Math.floor(Math.random() * 3) + 1,
          service_id: Math.floor(Math.random() * 5) + 1,
          appointment_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          client_name: 'Load Test Client',
          client_email: 'loadtest@example.com',
          client_phone: '+1234567890',
        };
        break;
      case '/api/v1/payments/create-intent':
        requestData = {
          amount: 5000, // $50.00
          currency: 'usd',
          appointment_id: Math.floor(Math.random() * 1000) + 1,
        };
        break;
    }
  }

  // Add query parameters for GET requests
  let url = `${BASE_URL}${endpoint.path}`;
  if (endpoint.method === 'GET' && endpoint.path.includes('availability')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    url += `?barber_id=${Math.floor(Math.random() * 3) + 1}&date=${dateStr}`;
  }

  // Make the request
  if (endpoint.method === 'POST' && requestData) {
    response = http.post(url, JSON.stringify(requestData), { headers });
  } else if (endpoint.method === 'GET') {
    response = http.get(url, { headers });
  } else if (endpoint.method === 'PUT' && requestData) {
    response = http.put(url, JSON.stringify(requestData), { headers });
  } else if (endpoint.method === 'DELETE') {
    response = http.del(url, null, { headers });
  } else {
    response = http.get(url, { headers });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  
  responseTime.add(duration);
  requestCount.add(1);

  // Check response
  const success = check(response, {
    'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
    'response time OK': (r) => duration < 5000,
    'not empty response': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  // Log errors for debugging
  if (!success) {
    console.log(`Error: ${endpoint.method} ${endpoint.path} - Status: ${response.status}, Duration: ${duration}ms`);
  }

  return response;
}

export default function () {
  const userIndex = __VU; // Virtual User index
  
  // Select random endpoint based on weights
  const endpoint = randomChoice(WEIGHTED_ENDPOINTS);
  
  // Get auth token if needed
  let token = null;
  if (endpoint.auth) {
    token = getAuthToken(userIndex);
    if (!token) {
      console.log('Failed to get auth token, skipping authenticated request');
      return;
    }
  }

  // Make the request
  makeRequest(endpoint, token);

  // Random sleep between 0.5-2 seconds to simulate user behavior
  sleep(Math.random() * 1.5 + 0.5);
}

// Setup function
export function setup() {
  console.log('Starting API endpoints load test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoints to test: ${ENDPOINTS.length}`);
  
  // Pre-authenticate test users
  console.log('Pre-authenticating test users...');
  for (let i = 0; i < TEST_USERS.length; i++) {
    getAuthToken(i);
  }
  
  // Verify API health
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`API load test completed in ${duration} seconds`);
  
  // Summary of endpoint distribution
  console.log('Endpoint distribution:');
  ENDPOINTS.forEach(endpoint => {
    const percentage = (endpoint.weight / WEIGHTED_ENDPOINTS.length * 100).toFixed(1);
    console.log(`  ${endpoint.method} ${endpoint.path}: ${percentage}%`);
  });
}