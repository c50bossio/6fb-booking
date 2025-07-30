import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Basic load testing metrics
export const basicMetrics = {
    apiResponseTime: new Trend('api_response_time'),
    authenticationTime: new Trend('authentication_time'),
    healthCheckTime: new Trend('health_check_time'),
    appointmentCreationTime: new Trend('appointment_creation_time'),
    
    authenticationErrors: new Counter('authentication_errors'),
    apiErrors: new Counter('api_errors'),
    timeoutErrors: new Counter('timeout_errors'),
    
    successfulLogins: new Rate('successful_logins'),
    apiAvailability: new Rate('api_availability'),
    bookingSuccessRate: new Rate('booking_success_rate')
};

// Load test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const MAX_USERS = parseInt(__ENV.MAX_CONCURRENT_USERS) || 1000;
const TEST_DURATION = __ENV.TEST_DURATION || '10m';

// Basic load test scenarios
export const options = {
    scenarios: {
        // Basic API health and authentication testing
        basic_health_check: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: Math.floor(MAX_USERS * 0.1) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.1) },
                { duration: '1m', target: 0 }
            ],
            exec: 'testBasicHealth'
        },
        
        // Authentication and basic API calls
        basic_api_operations: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: Math.floor(MAX_USERS * 0.4) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.4) },
                { duration: '1m', target: 0 }
            ],
            exec: 'testBasicApiOperations'
        },
        
        // Core booking workflow
        booking_workflow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: Math.floor(MAX_USERS * 0.3) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.3) },
                { duration: '1m', target: 0 }
            ],
            exec: 'testBookingWorkflow'
        },
        
        // Basic data retrieval
        data_retrieval: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: Math.floor(MAX_USERS * 0.2) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.2) },
                { duration: '1m', target: 0 }
            ],
            exec: 'testDataRetrieval'
        }
    },
    
    thresholds: {
        http_req_duration: ['p(95)<1500'],  // 95% of requests under 1.5s
        http_req_failed: ['rate<0.02'],     // Error rate under 2%
        api_response_time: ['p(90)<1000'],  // 90% of API calls under 1s
        authentication_time: ['p(95)<2000'], // Authentication under 2s
        successful_logins: ['rate>0.95'],   // 95% login success rate
        api_availability: ['rate>0.99'],    // 99% API availability
        booking_success_rate: ['rate>0.95'] // 95% booking success rate
    }
};

// Basic authentication function
function authenticateBasic() {
    const loginPayload = {
        username: `basictest${__VU}@bookedbarber.com`,
        password: 'BasicTest2024!'
    };
    
    const authStart = Date.now();
    const response = http.post(`${BASE_URL}/api/v2/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: '10s'
    });
    const authTime = Date.now() - authStart;
    basicMetrics.authenticationTime.add(authTime);
    
    const authSuccess = check(response, {
        'basic auth successful': (r) => r.status === 200,
        'basic token received': (r) => r.json('access_token') !== undefined
    });
    
    if (authSuccess) {
        basicMetrics.successfulLogins.add(1);
        return response.json('access_token');
    } else {
        basicMetrics.successfulLogins.add(0);
        basicMetrics.authenticationErrors.add(1);
        return null;
    }
}

// Basic health check testing
export function testBasicHealth() {
    // Test main health endpoint
    const healthStart = Date.now();
    const healthResponse = http.get(`${BASE_URL}/health`, { timeout: '5s' });
    const healthTime = Date.now() - healthStart;
    basicMetrics.healthCheckTime.add(healthTime);
    
    const healthSuccess = check(healthResponse, {
        'health endpoint accessible': (r) => r.status === 200,
        'health response time acceptable': (r) => r.timings.duration < 3000,
        'health response has status': (r) => {
            try {
                const data = r.json();
                return data && data.status;
            } catch {
                return false;
            }
        }
    });
    
    basicMetrics.apiAvailability.add(healthSuccess ? 1 : 0);
    
    if (!healthSuccess) {
        basicMetrics.apiErrors.add(1);
    }
    
    // Test API documentation endpoint
    const docsResponse = http.get(`${BASE_URL}/docs`, { timeout: '10s' });
    check(docsResponse, {
        'docs endpoint accessible': (r) => r.status === 200
    });
    
    sleep(1 + Math.random() * 2);
}

// Basic API operations testing
export function testBasicApiOperations() {
    // Authenticate
    const token = authenticateBasic();
    if (!token) {
        sleep(2);
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test user profile endpoint
    const apiStart = Date.now();
    const userResponse = http.get(`${BASE_URL}/api/v2/auth/me`, { headers, timeout: '10s' });
    const apiTime = Date.now() - apiStart;
    basicMetrics.apiResponseTime.add(apiTime);
    
    const userSuccess = check(userResponse, {
        'user profile accessible': (r) => r.status === 200,
        'user data present': (r) => {
            try {
                const data = r.json();
                return data && data.email;
            } catch {
                return false;
            }
        }
    });
    
    if (!userSuccess) {
        basicMetrics.apiErrors.add(1);
    }
    
    // Test basic endpoints
    const endpoints = [
        '/api/v2/services',
        '/api/v2/appointments',
        '/api/v2/clients'
    ];
    
    for (const endpoint of endpoints) {
        const response = http.get(`${BASE_URL}${endpoint}`, { headers, timeout: '10s' });
        
        const endpointSuccess = check(response, {
            [`${endpoint} accessible`]: (r) => r.status === 200 || r.status === 404, // 404 acceptable for empty data
            [`${endpoint} response time acceptable`]: (r) => r.timings.duration < 5000
        });
        
        if (!endpointSuccess && response.status >= 500) {
            basicMetrics.apiErrors.add(1);
        }
        
        sleep(0.5);
    }
    
    sleep(1 + Math.random() * 2);
}

// Booking workflow testing
export function testBookingWorkflow() {
    // Authenticate
    const token = authenticateBasic();
    if (!token) {
        sleep(2);
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Step 1: Get available services
    const servicesResponse = http.get(`${BASE_URL}/api/v2/services`, { headers, timeout: '10s' });
    const servicesAvailable = check(servicesResponse, {
        'services endpoint accessible': (r) => r.status === 200 || r.status === 404
    });
    
    // Step 2: Get clients
    const clientsResponse = http.get(`${BASE_URL}/api/v2/clients`, { headers, timeout: '10s' });
    const clientsAvailable = check(clientsResponse, {
        'clients endpoint accessible': (r) => r.status === 200 || r.status === 404
    });
    
    // Step 3: Attempt to create an appointment
    if (servicesAvailable && clientsAvailable) {
        const bookingStart = Date.now();
        
        const appointmentData = {
            client_id: Math.floor(Math.random() * 100) + 1,
            service_id: Math.floor(Math.random() * 10) + 1,
            appointment_datetime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 60,
            notes: `Basic load test appointment ${__VU}-${Date.now()}`
        };
        
        const bookingResponse = http.post(`${BASE_URL}/api/v2/appointments`, 
                                        JSON.stringify(appointmentData), 
                                        { headers, timeout: '15s' });
        
        const bookingTime = Date.now() - bookingStart;
        basicMetrics.appointmentCreationTime.add(bookingTime);
        
        const bookingSuccess = check(bookingResponse, {
            'appointment creation attempted': (r) => r.status === 200 || r.status === 201 || r.status === 400, // 400 acceptable for validation
            'booking response time acceptable': (r) => r.timings.duration < 10000
        });
        
        if (bookingResponse.status === 200 || bookingResponse.status === 201) {
            basicMetrics.bookingSuccessRate.add(1);
        } else if (bookingResponse.status >= 500) {
            basicMetrics.bookingSuccessRate.add(0);
            basicMetrics.apiErrors.add(1);
        } else {
            basicMetrics.bookingSuccessRate.add(0); // Client errors don't count as API errors
        }
    }
    
    sleep(2 + Math.random() * 3);
}

// Data retrieval testing
export function testDataRetrieval() {
    // Authenticate
    const token = authenticateBasic();
    if (!token) {
        sleep(2);
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test various data retrieval endpoints
    const dataEndpoints = [
        { endpoint: '/api/v2/appointments', description: 'appointments list' },
        { endpoint: '/api/v2/clients', description: 'clients list' },
        { endpoint: '/api/v2/services', description: 'services list' },
        { endpoint: '/api/v2/users/profile', description: 'user profile' },
        { endpoint: '/api/v2/dashboard/summary', description: 'dashboard summary' }
    ];
    
    for (const { endpoint, description } of dataEndpoints) {
        const retrievalStart = Date.now();
        const response = http.get(`${BASE_URL}${endpoint}`, { headers, timeout: '10s' });
        const retrievalTime = Date.now() - retrievalStart;
        
        basicMetrics.apiResponseTime.add(retrievalTime);
        
        const retrievalSuccess = check(response, {
            [`${description} retrieval successful`]: (r) => r.status === 200 || r.status === 404,
            [`${description} response time acceptable`]: (r) => r.timings.duration < 8000
        });
        
        if (response.status >= 500) {
            basicMetrics.apiErrors.add(1);
        }
        
        // Check for timeout
        if (response.timings.duration > 10000) {
            basicMetrics.timeoutErrors.add(1);
        }
        
        sleep(0.5 + Math.random() * 1);
    }
    
    sleep(1 + Math.random() * 2);
}

export function setup() {
    console.log('🚀 Starting BookedBarber V2 Basic Load Test');
    console.log(`📊 Target: ${MAX_USERS} concurrent users`);
    console.log(`⏰ Duration: ${TEST_DURATION}`);
    console.log(`🎯 Testing: ${BASE_URL}`);
    
    // Verify API is accessible
    const healthResponse = http.get(`${BASE_URL}/health`, { timeout: '10s' });
    if (healthResponse.status !== 200) {
        console.error(`❌ API health check failed: ${healthResponse.status}`);
        throw new Error(`API not accessible at ${BASE_URL}`);
    }
    
    console.log('✅ API health check passed - starting basic load test');
}

export function teardown(data) {
    console.log('🏁 Basic Load Test Completed');
    console.log('📈 Key metrics to review:');
    console.log('  • API response times and availability');
    console.log('  • Authentication success rates');
    console.log('  • Basic booking workflow performance');
    console.log('  • Error rates and timeout occurrences');
    console.log('  • Overall system stability under basic load');
}