import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for Six Figure Barber methodology
export const sixFigureBarberMetrics = {
    revenueOptimizationResponseTime: new Trend('six_fb_revenue_optimization_response_time'),
    crmResponseTime: new Trend('six_fb_crm_response_time'),
    dashboardResponseTime: new Trend('six_fb_dashboard_response_time'),
    authenticationErrors: new Counter('authentication_errors'),
    apiErrors: new Counter('api_errors'),
    paymentProcessingTime: new Trend('payment_processing_time'),
    bookingSuccessRate: new Rate('booking_success_rate')
};

// Load test configuration from environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const MAX_USERS = parseInt(__ENV.MAX_CONCURRENT_USERS) || 10000;
const TEST_DURATION = __ENV.TEST_DURATION || '30m';
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '5m';

// Load test data
const testUsers = new SharedArray('test-users', function () {
    return Array.from({ length: 1000 }, (_, i) => ({
        email: `loadtest${i}@bookedbarber.com`,
        password: 'LoadTest2024!',
        shopName: `Load Test Shop ${i}`,
        barberName: `Test Barber ${i}`
    }));
});

// Six Figure Barber test scenarios
const sixFigureBarberScenarios = {
    // Revenue optimization testing
    revenue_optimization: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: RAMP_UP_TIME, target: Math.floor(MAX_USERS * 0.3) },
            { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.3) },
            { duration: '2m', target: 0 }
        ],
        exec: 'testRevenueOptimization'
    },
    
    // CRM functionality testing
    crm_operations: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: RAMP_UP_TIME, target: Math.floor(MAX_USERS * 0.25) },
            { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.25) },
            { duration: '2m', target: 0 }
        ],
        exec: 'testCRMOperations'
    },
    
    // Dashboard analytics testing
    dashboard_analytics: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: RAMP_UP_TIME, target: Math.floor(MAX_USERS * 0.2) },
            { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.2) },
            { duration: '2m', target: 0 }
        ],
        exec: 'testDashboardAnalytics'
    },
    
    // Core platform testing
    core_platform: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: RAMP_UP_TIME, target: Math.floor(MAX_USERS * 0.25) },
            { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.25) },
            { duration: '2m', target: 0 }
        ],
        exec: 'testCorePlatform'
    }
};

export const options = {
    scenarios: sixFigureBarberScenarios,
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
        http_req_failed: ['rate<0.01'], // Error rate under 1%
        six_fb_revenue_optimization_response_time: ['p(90)<1500'],
        six_fb_crm_response_time: ['p(90)<1000'],
        six_fb_dashboard_response_time: ['p(90)<2000'],
        booking_success_rate: ['rate>0.99'] // 99% booking success rate
    }
};

// Authentication helper
function authenticate(userIndex = 0) {
    const user = testUsers[userIndex % testUsers.length];
    const loginPayload = {
        username: user.email,
        password: user.password
    };
    
    const response = http.post(`${BASE_URL}/api/v2/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (check(response, {
        'login successful': (r) => r.status === 200,
        'token received': (r) => r.json('access_token') !== undefined
    })) {
        return response.json('access_token');
    } else {
        sixFigureBarberMetrics.authenticationErrors.add(1);
        return null;
    }
}

// Revenue Optimization Testing
export function testRevenueOptimization() {
    const token = authenticate(__VU - 1);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test revenue metrics endpoint
    const revenueStart = Date.now();
    const revenueResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/revenue/metrics`, { headers });
    sixFigureBarberMetrics.revenueOptimizationResponseTime.add(Date.now() - revenueStart);
    
    check(revenueResponse, {
        'revenue metrics success': (r) => r.status === 200,
        'revenue data present': (r) => r.json('daily_revenue') !== undefined,
        'optimization opportunities': (r) => r.json('optimization_opportunities') !== undefined
    });
    
    // Test revenue goal progress
    const goalResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/revenue/goals/progress`, { headers });
    check(goalResponse, {
        'goal progress success': (r) => r.status === 200
    });
    
    // Create a revenue goal
    const goalData = {
        goal_name: `Load Test Goal ${__VU}`,
        target_annual_revenue: 100000 + Math.random() * 50000,
        start_date: '2024-01-01',
        target_date: '2024-12-31',
        sfb_principle_focus: 'REVENUE_OPTIMIZATION'
    };
    
    const createGoalResponse = http.post(`${BASE_URL}/api/v2/six-figure-barber/revenue/goals`, JSON.stringify(goalData), { headers });
    check(createGoalResponse, {
        'goal creation success': (r) => r.status === 200
    });
    
    sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}

// CRM Operations Testing
export function testCRMOperations() {
    const token = authenticate(__VU - 1);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test client value tiers
    const crmStart = Date.now();
    const tiersResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/value-tiers`, { headers });
    sixFigureBarberMetrics.crmResponseTime.add(Date.now() - crmStart);
    
    check(tiersResponse, {
        'client tiers success': (r) => r.status === 200,
        'tier distribution present': (r) => r.json('tier_distribution') !== undefined
    });
    
    // Test client value profile (using a mock client ID)
    const clientId = Math.floor(Math.random() * 100) + 1;
    const profileResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/${clientId}/value-profile`, { headers });
    
    // Test client journey tracking
    const journeyResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/${clientId}/journey`, { headers });
    
    sleep(Math.random() * 2 + 1);
}

// Dashboard Analytics Testing
export function testDashboardAnalytics() {
    const token = authenticate(__VU - 1);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test comprehensive dashboard
    const dashboardStart = Date.now();
    const dashboardResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/dashboard`, { headers });
    sixFigureBarberMetrics.dashboardResponseTime.add(Date.now() - dashboardStart);
    
    check(dashboardResponse, {
        'dashboard success': (r) => r.status === 200,
        'overall score present': (r) => r.json('overall_score') !== undefined,
        'key insights present': (r) => r.json('key_insights') !== undefined,
        'critical actions present': (r) => r.json('critical_actions') !== undefined
    });
    
    // Test efficiency metrics
    const efficiencyResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/efficiency/metrics`, { headers });
    check(efficiencyResponse, {
        'efficiency metrics success': (r) => r.status === 200
    });
    
    // Test growth metrics
    const growthResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/growth/metrics`, { headers });
    check(growthResponse, {
        'growth metrics success': (r) => r.status === 200
    });
    
    // Test service excellence standards
    const excellenceResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/service-excellence/standards`, { headers });
    check(excellenceResponse, {
        'service excellence success': (r) => r.status === 200
    });
    
    sleep(Math.random() * 3 + 2); // Longer think time for dashboard views
}

// Core Platform Testing
export function testCorePlatform() {
    const token = authenticate(__VU - 1);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test user profile
    const userResponse = http.get(`${BASE_URL}/api/v2/auth/me`, { headers });
    check(userResponse, {
        'user profile success': (r) => r.status === 200
    });
    
    // Test appointments endpoint
    const appointmentsResponse = http.get(`${BASE_URL}/api/v2/appointments`, { headers });
    check(appointmentsResponse, {
        'appointments success': (r) => r.status === 200
    });
    
    // Test services endpoint
    const servicesResponse = http.get(`${BASE_URL}/api/v2/services`, { headers });
    check(servicesResponse, {
        'services success': (r) => r.status === 200
    });
    
    // Test clients endpoint
    const clientsResponse = http.get(`${BASE_URL}/api/v2/clients`, { headers });
    check(clientsResponse, {
        'clients success': (r) => r.status === 200
    });
    
    // Simulate booking creation
    const bookingData = {
        client_id: Math.floor(Math.random() * 100) + 1,
        service_id: Math.floor(Math.random() * 10) + 1,
        appointment_datetime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        notes: `Load test booking from VU ${__VU}`
    };
    
    const bookingStart = Date.now();
    const bookingResponse = http.post(`${BASE_URL}/api/v2/appointments`, JSON.stringify(bookingData), { headers });
    
    const bookingSuccess = check(bookingResponse, {
        'booking creation success': (r) => r.status === 200 || r.status === 201
    });
    
    sixFigureBarberMetrics.bookingSuccessRate.add(bookingSuccess ? 1 : 0);
    
    if (!bookingSuccess) {
        sixFigureBarberMetrics.apiErrors.add(1);
    }
    
    sleep(Math.random() * 2 + 1);
}

// Health check for monitoring
export function setup() {
    console.log('Starting BookedBarber V2 Enterprise Load Test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Max Users: ${MAX_USERS}`);
    console.log(`Test Duration: ${TEST_DURATION}`);
    
    // Verify API availability
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) {
        throw new Error(`API health check failed: ${healthResponse.status}`);
    }
    
    console.log('API health check passed - starting load test');
}

export function teardown() {
    console.log('Load test completed');
    console.log('Check results for Six Figure Barber methodology performance metrics');
}