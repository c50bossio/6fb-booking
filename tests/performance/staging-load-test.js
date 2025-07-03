import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.bookedbarber.com';
const API_URL = __ENV.API_URL || 'https://api-staging.bookedbarber.com';

// Load test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },  // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 },  // Ramp up to 50 users over 5 minutes
    { duration: '10m', target: 100 }, // Maintain 100 users for 10 minutes
    { duration: '5m', target: 200 },  // Spike to 200 users for 5 minutes
    { duration: '5m', target: 100 },  // Drop back to 100 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.02'],    // Error rate must be below 2%
    error_rate: ['rate<0.05'],         // Custom error rate below 5%
    response_time: ['p(95)<500'],      // 95% of response times below 500ms
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:us:palo alto': { loadZone: 'amazon:us:palo alto', percent: 50 },
      },
    },
  },
};

// Test data
const testUsers = [
  { email: 'testuser1@example.com', password: 'TestPassword123!' },
  { email: 'testuser2@example.com', password: 'TestPassword123!' },
  { email: 'testuser3@example.com', password: 'TestPassword123!' },
];

export function setup() {
  // Setup test data if needed
  console.log('Setting up load test...');
  
  // Health check before starting
  const healthResponse = http.get(`${API_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`API health check failed: ${healthResponse.status}`);
  }
  
  console.log('Setup complete. Starting load test...');
  return { timestamp: new Date().toISOString() };
}

export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test/1.0',
    },
    timeout: '30s',
  };

  group('Health Checks', () => {
    group('API Health', () => {
      const response = http.get(`${API_URL}/health`, params);
      
      const success = check(response, {
        'API health status is 200': (r) => r.status === 200,
        'API health response time < 500ms': (r) => r.timings.duration < 500,
        'API health contains status': (r) => r.json('status') === 'healthy',
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });

    group('Frontend Health', () => {
      const response = http.get(BASE_URL, params);
      
      const success = check(response, {
        'Frontend status is 200': (r) => r.status === 200,
        'Frontend response time < 2000ms': (r) => r.timings.duration < 2000,
        'Frontend contains BookedBarber': (r) => r.body.includes('BookedBarber'),
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });
  });

  group('API Endpoints', () => {
    group('Services Endpoint', () => {
      const response = http.get(`${API_URL}/api/v1/services`, params);
      
      const success = check(response, {
        'Services status is 200': (r) => r.status === 200,
        'Services response time < 1000ms': (r) => r.timings.duration < 1000,
        'Services returns array': (r) => Array.isArray(r.json()),
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });

    group('Locations Endpoint', () => {
      const response = http.get(`${API_URL}/api/v1/locations`, params);
      
      const success = check(response, {
        'Locations status is 200': (r) => r.status === 200,
        'Locations response time < 1000ms': (r) => r.timings.duration < 1000,
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });

    group('Availability Endpoint', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const response = http.get(
        `${API_URL}/api/v1/appointments/available?date=${dateStr}&service_id=1`,
        params
      );
      
      const success = check(response, {
        'Availability status is 200 or 401': (r) => [200, 401].includes(r.status),
        'Availability response time < 1500ms': (r) => r.timings.duration < 1500,
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });
  });

  group('Authentication Flow', () => {
    const testUser = testUsers[Math.floor(Math.random() * testUsers.length)];
    
    group('Login Attempt', () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };
      
      const response = http.post(
        `${API_URL}/api/v1/auth/login`,
        JSON.stringify(loginData),
        params
      );
      
      const isSuccess = response.status === 200;
      const success = check(response, {
        'Login response time < 2000ms': (r) => r.timings.duration < 2000,
        'Login status is valid': (r) => [200, 401, 422].includes(r.status),
      });
      
      if (isSuccess) {
        successfulLogins.add(1);
      } else {
        failedLogins.add(1);
      }
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
      
      // If login successful, test protected endpoint
      if (isSuccess && response.json('access_token')) {
        const token = response.json('access_token');
        const authParams = {
          headers: {
            ...params.headers,
            'Authorization': `Bearer ${token}`,
          },
        };
        
        group('Protected Endpoint Access', () => {
          const profileResponse = http.get(`${API_URL}/api/v1/users/me`, authParams);
          
          const profileSuccess = check(profileResponse, {
            'Profile status is 200': (r) => r.status === 200,
            'Profile response time < 1000ms': (r) => r.timings.duration < 1000,
            'Profile contains user data': (r) => r.json('email') !== undefined,
          });
          
          errorRate.add(!profileSuccess);
          responseTime.add(profileResponse.timings.duration);
        });
      }
    });
  });

  group('Booking Flow Simulation', () => {
    // Simulate booking flow without authentication
    group('Service Selection', () => {
      const response = http.get(`${API_URL}/api/v1/services/1`, params);
      
      const success = check(response, {
        'Service detail status is 200': (r) => r.status === 200,
        'Service detail response time < 1000ms': (r) => r.timings.duration < 1000,
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });

    group('Time Slot Check', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const response = http.get(
        `${API_URL}/api/v1/appointments/slots?date=${dateStr}&service_id=1&duration=60`,
        params
      );
      
      const success = check(response, {
        'Time slots response time < 2000ms': (r) => r.timings.duration < 2000,
        'Time slots status is valid': (r) => [200, 401, 404].includes(r.status),
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });
  });

  group('Static Assets', () => {
    // Test loading of static assets
    group('Homepage Assets', () => {
      const response = http.get(`${BASE_URL}/favicon.ico`, params);
      
      const success = check(response, {
        'Favicon loads successfully': (r) => [200, 404].includes(r.status), // 404 is acceptable
        'Favicon response time < 1000ms': (r) => r.timings.duration < 1000,
      });
      
      errorRate.add(!success);
      responseTime.add(response.timings.duration);
    });
  });

  // Random sleep between 1-5 seconds to simulate user behavior
  sleep(Math.random() * 4 + 1);
}

export function teardown(data) {
  console.log('Tearing down load test...');
  console.log(`Test started at: ${data.timestamp}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
  
  // Final health check
  const healthResponse = http.get(`${API_URL}/health`);
  if (healthResponse.status !== 200) {
    console.warn(`API health check failed after test: ${healthResponse.status}`);
  } else {
    console.log('API health check passed after test completion');
  }
}

// Utility functions for data generation
export function generateRandomEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'example.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username = `testuser${Math.floor(Math.random() * 10000)}`;
  return `${username}@${domain}`;
}

export function generateRandomPhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${exchange}-${number}`;
}