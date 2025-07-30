import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Stress testing metrics
export const stressMetrics = {
    breakingPointUsers: new Counter('breaking_point_users'),
    recoveryTime: new Trend('recovery_time_seconds'),
    errorSpike: new Rate('error_spike_rate'),
    systemRecovery: new Rate('system_recovery_rate'),
    autoScalingTrigger: new Counter('auto_scaling_triggers'),
    resourceExhaustion: new Counter('resource_exhaustion_events')
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const STRESS_MAX_USERS = parseInt(__ENV.MAX_CONCURRENT_USERS) || 15000; // Higher than normal capacity

// Aggressive stress testing scenarios
export const options = {
    scenarios: {
        // Gradual load increase to find breaking point
        breaking_point_test: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 1000,
            maxVUs: STRESS_MAX_USERS,
            stages: [
                { duration: '2m', target: 50 },   // Start normal
                { duration: '5m', target: 200 },  // Increase load
                { duration: '5m', target: 500 },  // Heavy load
                { duration: '5m', target: 1000 }, // Very heavy
                { duration: '5m', target: 2000 }, // Extreme load
                { duration: '5m', target: 3000 }, // Breaking point search
                { duration: '10m', target: 5000 }, // Sustained extreme load
                { duration: '2m', target: 0 }     // Recovery
            ],
            exec: 'stressTestCore'
        },
        
        // Spike testing - sudden load bursts
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 0 },
                { duration: '30s', target: 2000 }, // Sudden spike
                { duration: '2m', target: 2000 },  // Sustain spike
                { duration: '30s', target: 0 },    // Drop
                { duration: '1m', target: 0 },     // Recovery period
                { duration: '30s', target: 3000 }, // Bigger spike
                { duration: '2m', target: 3000 },
                { duration: '30s', target: 0 }
            ],
            exec: 'spikeTestEndpoints'
        },
        
        // Database stress testing
        database_stress: {
            executor: 'constant-vus',
            vus: 500,
            duration: '20m',
            exec: 'stressDatabaseOperations'
        },
        
        // Six Figure Barber methodology under extreme load
        six_figure_stress: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '3m', target: 1000 },
                { duration: '10m', target: 1000 },
                { duration: '2m', target: 0 }
            ],
            exec: 'stressSixFigureBarber'
        }
    },
    
    thresholds: {
        http_req_duration: ['p(99)<10000'], // Allow higher response times under stress
        http_req_failed: ['rate<0.05'],     // Allow 5% error rate under extreme stress
        breaking_point_users: ['count>0'],  // Expect to find breaking point
        system_recovery_rate: ['rate>0.95'] // System should recover 95% of the time
    }
};

// Authentication with retry logic for stress testing
function authenticateWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const response = http.post(`${BASE_URL}/api/v2/auth/login`, {
            username: `loadtest${__VU}@bookedbarber.com`,
            password: 'LoadTest2024!'
        });
        
        if (response.status === 200 && response.json('access_token')) {
            return response.json('access_token');
        }
        
        if (i < maxRetries - 1) {
            sleep(1); // Wait before retry
        }
    }
    return null;
}

// Core stress testing function
export function stressTestCore() {
    const token = authenticateWithRetry();
    if (!token) {
        stressMetrics.errorSpike.add(1);
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test multiple endpoints rapidly
    const endpoints = [
        '/api/v2/auth/me',
        '/api/v2/appointments',
        '/api/v2/clients',
        '/api/v2/services',
        '/health'
    ];
    
    let successCount = 0;
    const startTime = Date.now();
    
    for (const endpoint of endpoints) {
        const response = http.get(`${BASE_URL}${endpoint}`, { headers });
        
        if (response.status < 400) {
            successCount++;
        } else if (response.status >= 500) {
            stressMetrics.errorSpike.add(1);
        }
        
        // Track when we might be hitting breaking point
        if (response.timings.duration > 10000) { // 10+ second responses
            stressMetrics.breakingPointUsers.add(1);
        }
    }
    
    // Check system recovery
    if (successCount >= endpoints.length * 0.8) { // 80% success rate
        stressMetrics.systemRecovery.add(1);
    }
    
    sleep(0.1); // Minimal think time for stress testing
}

// Spike testing for sudden load bursts
export function spikeTestEndpoints() {
    const token = authenticateWithRetry();
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Hit high-computation endpoints during spikes
    const heavyEndpoints = [
        '/api/v2/six-figure-barber/dashboard',
        '/api/v2/six-figure-barber/revenue/metrics',
        '/api/v2/analytics/dashboard-data',
        '/api/v2/appointments?limit=100',
        '/api/v2/clients?limit=100'
    ];
    
    const endpoint = heavyEndpoints[Math.floor(Math.random() * heavyEndpoints.length)];
    const response = http.get(`${BASE_URL}${endpoint}`, { headers });
    
    // Track auto-scaling triggers (high CPU/memory usage indicators)
    if (response.timings.duration > 5000) {
        stressMetrics.autoScalingTrigger.add(1);
    }
    
    sleep(0.5);
}

// Database stress testing
export function stressDatabaseOperations() {
    const token = authenticateWithRetry();
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Heavy database operations
    const dbIntensiveOperations = [
        // Create appointments (INSERT operations)
        () => {
            const appointmentData = {
                client_id: Math.floor(Math.random() * 1000) + 1,
                service_id: Math.floor(Math.random() * 20) + 1,
                appointment_datetime: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 60,
                notes: `Stress test appointment ${__VU}-${Date.now()}`
            };
            return http.post(`${BASE_URL}/api/v2/appointments`, JSON.stringify(appointmentData), { headers });
        },
        
        // Query appointments (SELECT with JOINs)
        () => http.get(`${BASE_URL}/api/v2/appointments?limit=50&include_client=true&include_service=true`, { headers }),
        
        // Revenue analytics (complex aggregations)
        () => http.get(`${BASE_URL}/api/v2/six-figure-barber/revenue/metrics`, { headers }),
        
        // Client analytics (complex queries)
        () => http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/value-tiers`, { headers })
    ];
    
    // Execute random database operation
    const operation = dbIntensiveOperations[Math.floor(Math.random() * dbIntensiveOperations.length)];
    const startTime = Date.now();
    const response = operation();
    const duration = Date.now() - startTime;
    
    // Track potential database overload
    if (duration > 5000 || response.status === 503 || response.status === 504) {
        stressMetrics.resourceExhaustion.add(1);
    }
    
    sleep(0.2);
}

// Six Figure Barber methodology stress testing
export function stressSixFigureBarber() {
    const token = authenticateWithRetry();
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Stress test Six Figure Barber specific endpoints
    const sixFBEndpoints = [
        '/api/v2/six-figure-barber/dashboard',
        '/api/v2/six-figure-barber/revenue/metrics',
        '/api/v2/six-figure-barber/revenue/goals/progress',
        '/api/v2/six-figure-barber/efficiency/metrics',
        '/api/v2/six-figure-barber/growth/metrics',
        '/api/v2/six-figure-barber/clients/value-tiers'
    ];
    
    // Rapid-fire requests to test methodology implementation under stress
    for (const endpoint of sixFBEndpoints) {
        const response = http.get(`${BASE_URL}${endpoint}`, { headers });
        
        if (response.status >= 500) {
            stressMetrics.errorSpike.add(1);
        }
        
        // Test service excellence tracking under load
        if (Math.random() < 0.3) { // 30% chance to create service excellence record
            const excellenceData = {
                appointment_id: Math.floor(Math.random() * 1000) + 1,
                excellence_scores: {
                    'CONSULTATION_QUALITY': Math.random() * 100,
                    'TECHNICAL_SKILL': Math.random() * 100,
                    'CLIENT_EXPERIENCE': Math.random() * 100,
                    'PROFESSIONALISM': Math.random() * 100
                }
            };
            
            http.post(`${BASE_URL}/api/v2/six-figure-barber/service-excellence/track`, 
                     JSON.stringify(excellenceData), { headers });
        }
    }
    
    sleep(0.3);
}

export function setup() {
    console.log('Starting BookedBarber V2 STRESS TEST');
    console.log(`🚨 WARNING: This will push the system to its limits`);
    console.log(`Target Users: ${STRESS_MAX_USERS}`);
    
    // Verify system is ready for stress testing
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) {
        throw new Error(`System not ready for stress testing: ${healthResponse.status}`);
    }
    
    console.log('🚀 System ready - beginning stress test');
}

export function teardown() {
    console.log('🏁 Stress test completed');
    console.log('📊 Check stress metrics for:');
    console.log('  - Breaking point identification');
    console.log('  - Auto-scaling behavior');
    console.log('  - System recovery rates');
    console.log('  - Resource exhaustion events');
}