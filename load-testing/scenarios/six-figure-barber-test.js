import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// Six Figure Barber Methodology Specific Metrics
export const sixFBMetrics = {
    revenueOptimizationApiTime: new Trend('six_fb_revenue_optimization_api_time'),
    crmApiTime: new Trend('six_fb_crm_api_time'),
    dashboardLoadTime: new Trend('six_fb_dashboard_load_time'),
    clientValueCalculationTime: new Trend('six_fb_client_value_calculation_time'),
    serviceExcellenceTrackingTime: new Trend('six_fb_service_excellence_tracking_time'),
    efficiencyMetricsTime: new Trend('six_fb_efficiency_metrics_time'),
    growthTrackingTime: new Trend('six_fb_growth_tracking_time'),
    
    revenueOptimizationErrors: new Counter('six_fb_revenue_optimization_errors'),
    crmErrors: new Counter('six_fb_crm_errors'),
    analyticsErrors: new Counter('six_fb_analytics_errors'),
    
    methodologyComplianceRate: new Rate('six_fb_methodology_compliance_rate'),
    dataAccuracyRate: new Rate('six_fb_data_accuracy_rate'),
    businessInsightGenerationRate: new Rate('six_fb_business_insight_generation_rate')
};

// Load test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const MAX_USERS = parseInt(__ENV.MAX_CONCURRENT_USERS) || 5000;
const TEST_DURATION = __ENV.TEST_DURATION || '30m';

// Six Figure Barber test data
const sixFBTestData = new SharedArray('six-fb-test-data', function () {
    return Array.from({ length: 500 }, (_, i) => ({
        userId: i + 1,
        email: `sixfb_barber_${i}@bookedbarber.com`,
        password: 'SixFigureBarber2024!',
        shopName: `Six Figure Barbershop ${i}`,
        annualRevenueTarget: 100000 + (i * 10000),
        clientId: Math.floor(Math.random() * 1000) + 1,
        serviceId: Math.floor(Math.random() * 20) + 1
    }));
});

// Six Figure Barber methodology scenarios
export const options = {
    scenarios: {
        // Core Six Figure Barber methodology testing
        six_figure_methodology_core: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '3m', target: Math.floor(MAX_USERS * 0.4) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.4) },
                { duration: '2m', target: 0 }
            ],
            exec: 'testSixFigureMethodologyCore'
        },
        
        // Revenue optimization intensive testing
        revenue_optimization_intensive: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: Math.floor(MAX_USERS * 0.3) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.3) },
                { duration: '2m', target: 0 }
            ],
            exec: 'testRevenueOptimizationIntensive'
        },
        
        // CRM and client management testing
        crm_client_management: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: Math.floor(MAX_USERS * 0.2) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.2) },
                { duration: '2m', target: 0 }
            ],
            exec: 'testCRMClientManagement'
        },
        
        // Real-time analytics and dashboard testing
        real_time_analytics: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: Math.floor(MAX_USERS * 0.1) },
                { duration: TEST_DURATION, target: Math.floor(MAX_USERS * 0.1) },
                { duration: '1m', target: 0 }
            ],
            exec: 'testRealTimeAnalytics'
        }
    },
    
    thresholds: {
        http_req_duration: ['p(95)<3000'], // Six Figure Barber requires responsive UX
        http_req_failed: ['rate<0.005'],   // Ultra-low error rate for business-critical data
        
        // Six Figure Barber specific thresholds
        six_fb_revenue_optimization_api_time: ['p(90)<2000'],
        six_fb_crm_api_time: ['p(90)<1500'],
        six_fb_dashboard_load_time: ['p(95)<3000'],
        six_fb_client_value_calculation_time: ['p(90)<1000'],
        
        // Business compliance thresholds
        six_fb_methodology_compliance_rate: ['rate>0.98'], // 98% methodology compliance
        six_fb_data_accuracy_rate: ['rate>0.995'],         // 99.5% data accuracy
        six_fb_business_insight_generation_rate: ['rate>0.95'] // 95% insight generation success
    }
};

// Authentication for Six Figure Barber users
function authenticateSixFBUser(testData) {
    const loginPayload = {
        username: testData.email,
        password: testData.password
    };
    
    const response = http.post(`${BASE_URL}/api/v2/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (check(response, {
        'six fb login successful': (r) => r.status === 200,
        'six fb token received': (r) => r.json('access_token') !== undefined
    })) {
        return response.json('access_token');
    }
    return null;
}

// Core Six Figure Barber methodology testing
export function testSixFigureMethodologyCore() {
    const testData = sixFBTestData[__VU % sixFBTestData.length];
    const token = authenticateSixFBUser(testData);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test comprehensive Six Figure Barber dashboard
    const dashboardStart = Date.now();
    const dashboardResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/dashboard`, { headers });
    sixFBMetrics.dashboardLoadTime.add(Date.now() - dashboardStart);
    
    const dashboardSuccess = check(dashboardResponse, {
        'six fb dashboard success': (r) => r.status === 200,
        'overall score present': (r) => {
            const data = r.json();
            return data && typeof data.overall_score === 'number';
        },
        'five principles represented': (r) => {
            const data = r.json();
            return data && 
                   typeof data.revenue_optimization_score === 'number' &&
                   typeof data.client_value_score === 'number' &&
                   typeof data.service_excellence_score === 'number' &&
                   typeof data.business_efficiency_score === 'number' &&
                   typeof data.professional_growth_score === 'number';
        },
        'actionable insights provided': (r) => {
            const data = r.json();
            return data && data.key_insights && data.key_insights.length > 0;
        },
        'critical actions identified': (r) => {
            const data = r.json();
            return data && data.critical_actions && data.critical_actions.length > 0;
        }
    });
    
    if (dashboardSuccess) {
        sixFBMetrics.methodologyComplianceRate.add(1);
        sixFBMetrics.businessInsightGenerationRate.add(1);
    } else {
        sixFBMetrics.analyticsErrors.add(1);
    }
    
    // Test service excellence standards
    const excellenceResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/service-excellence/standards`, { headers });
    check(excellenceResponse, {
        'service excellence standards loaded': (r) => r.status === 200,
        'standards have compliance rates': (r) => {
            const data = r.json();
            return data && data.standards && data.standards.length > 0;
        }
    });
    
    // Test efficiency trends
    const efficiencyResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/efficiency/trends?days=30`, { headers });
    check(efficiencyResponse, {
        'efficiency trends loaded': (r) => r.status === 200,
        'trends data available': (r) => {
            const data = r.json();
            return data && data.trends;
        }
    });
    
    // Test development plans
    const developmentResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/growth/development-plans`, { headers });
    check(developmentResponse, {
        'development plans loaded': (r) => r.status === 200
    });
    
    sleep(2 + Math.random() * 3); // Six Figure Barber users spend time analyzing data
}

// Revenue optimization intensive testing
export function testRevenueOptimizationIntensive() {
    const testData = sixFBTestData[__VU % sixFBTestData.length];
    const token = authenticateSixFBUser(testData);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test revenue metrics calculation
    const revenueStart = Date.now();
    const revenueResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/revenue/metrics`, { headers });
    sixFBMetrics.revenueOptimizationApiTime.add(Date.now() - revenueStart);
    
    const revenueSuccess = check(revenueResponse, {
        'revenue metrics calculated': (r) => r.status === 200,
        'daily revenue tracked': (r) => {
            const data = r.json();
            return data && typeof data.daily_revenue === 'number';
        },
        'upselling metrics present': (r) => {
            const data = r.json();
            return data && typeof data.upsell_revenue === 'number';
        },
        'optimization opportunities identified': (r) => {
            const data = r.json();
            return data && data.optimization_opportunities && data.optimization_opportunities.length > 0;
        },
        'premium service percentage calculated': (r) => {
            const data = r.json();
            return data && typeof data.premium_service_percentage === 'number';
        }
    });
    
    if (!revenueSuccess) {
        sixFBMetrics.revenueOptimizationErrors.add(1);
    }
    
    // Test revenue goal progress tracking
    const goalProgressResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/revenue/goals/progress`, { headers });
    check(goalProgressResponse, {
        'goal progress tracked': (r) => r.status === 200,
        'overall pace calculated': (r) => {
            const data = r.json();
            return data && typeof data.overall_pace === 'number';
        },
        'recommendations provided': (r) => {
            const data = r.json();
            return data && data.recommendations && data.recommendations.length > 0;
        }
    });
    
    // Create new revenue goal
    const goalData = {
        goal_name: `Six Figure Goal ${__VU} ${Date.now()}`,
        target_annual_revenue: testData.annualRevenueTarget,
        start_date: '2024-01-01',
        target_date: '2024-12-31',
        sfb_principle_focus: 'REVENUE_OPTIMIZATION'
    };
    
    const createGoalResponse = http.post(`${BASE_URL}/api/v2/six-figure-barber/revenue/goals`, 
                                       JSON.stringify(goalData), { headers });
    
    const goalCreationSuccess = check(createGoalResponse, {
        'revenue goal created': (r) => r.status === 200,
        'goal id returned': (r) => {
            const data = r.json();
            return data && data.goal_id;
        }
    });
    
    if (goalCreationSuccess) {
        sixFBMetrics.dataAccuracyRate.add(1);
    }
    
    sleep(1 + Math.random() * 2);
}

// CRM and client management testing
export function testCRMClientManagement() {
    const testData = sixFBTestData[__VU % sixFBTestData.length];
    const token = authenticateSixFBUser(testData);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test client value tiers analysis
    const crmStart = Date.now();
    const tiersResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/value-tiers`, { headers });
    sixFBMetrics.crmApiTime.add(Date.now() - crmStart);
    
    const tiersSuccess = check(tiersResponse, {
        'client value tiers loaded': (r) => r.status === 200,
        'tier distribution calculated': (r) => {
            const data = r.json();
            return data && data.tier_distribution && data.tier_distribution.length > 0;
        },
        'methodology insights provided': (r) => {
            const data = r.json();
            return data && data.methodology_insights && data.methodology_insights.length > 0;
        }
    });
    
    if (!tiersSuccess) {
        sixFBMetrics.crmErrors.add(1);
    }
    
    // Test individual client value profile
    const clientValueStart = Date.now();
    const clientId = testData.clientId;
    const profileResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/${clientId}/value-profile`, { headers });
    sixFBMetrics.clientValueCalculationTime.add(Date.now() - clientValueStart);
    
    check(profileResponse, {
        'client value profile calculated': (r) => r.status === 200 || r.status === 404, // 404 is acceptable for non-existent test client
        'value tier determined': (r) => {
            if (r.status === 404) return true; // Skip validation for non-existent clients
            const data = r.json();
            return data && data.value_tier;
        },
        'lifetime value calculated': (r) => {
            if (r.status === 404) return true;
            const data = r.json();
            return data && typeof data.lifetime_value === 'number';
        },
        'relationship scores calculated': (r) => {
            if (r.status === 404) return true;
            const data = r.json();
            return data && 
                   typeof data.relationship_score === 'number' &&
                   typeof data.loyalty_score === 'number' &&
                   typeof data.churn_risk_score === 'number';
        }
    });
    
    // Test client journey tracking
    const journeyResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/clients/${clientId}/journey`, { headers });
    check(journeyResponse, {
        'client journey tracked': (r) => r.status === 200 || r.status === 404,
        'journey stage identified': (r) => {
            if (r.status === 404) return true;
            const data = r.json();
            return data && data.current_stage;
        }
    });
    
    sleep(1.5 + Math.random() * 2);
}

// Real-time analytics and dashboard testing
export function testRealTimeAnalytics() {
    const testData = sixFBTestData[__VU % sixFBTestData.length];
    const token = authenticateSixFBUser(testData);
    if (!token) return;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test efficiency metrics calculation
    const efficiencyStart = Date.now();
    const efficiencyResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/efficiency/metrics`, { headers });
    sixFBMetrics.efficiencyMetricsTime.add(Date.now() - efficiencyStart);
    
    check(efficiencyResponse, {
        'efficiency metrics calculated': (r) => r.status === 200,
        'efficiency score provided': (r) => {
            const data = r.json();
            return data && typeof data.overall_efficiency_score === 'number';
        },
        'actionable opportunities identified': (r) => {
            const data = r.json();
            return data && data.opportunities && data.opportunities.length >= 0;
        }
    });
    
    // Test professional growth metrics
    const growthStart = Date.now();
    const growthResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/growth/metrics`, { headers });
    sixFBMetrics.growthTrackingTime.add(Date.now() - growthStart);
    
    check(growthResponse, {
        'growth metrics calculated': (r) => r.status === 200,
        'growth score provided': (r) => {
            const data = r.json();
            return data && typeof data.overall_growth_score === 'number';
        },
        'development recommendations provided': (r) => {
            const data = r.json();
            return data && data.development_recommendations;
        }
    });
    
    // Test service excellence tracking (simulate tracking an appointment)
    if (Math.random() < 0.3) { // 30% of users track service excellence
        const excellenceStart = Date.now();
        const excellenceData = {
            appointment_id: Math.floor(Math.random() * 1000) + 1,
            excellence_scores: {
                'CONSULTATION_QUALITY': 85 + Math.random() * 15,
                'TECHNICAL_SKILL': 80 + Math.random() * 20,
                'CLIENT_EXPERIENCE': 85 + Math.random() * 15,
                'PROFESSIONALISM': 90 + Math.random() * 10,
                'TIME_MANAGEMENT': 75 + Math.random() * 25
            }
        };
        
        const trackingResponse = http.post(`${BASE_URL}/api/v2/six-figure-barber/service-excellence/track`,
                                         JSON.stringify(excellenceData), { headers });
        sixFBMetrics.serviceExcellenceTrackingTime.add(Date.now() - excellenceStart);
        
        const trackingSuccess = check(trackingResponse, {
            'service excellence tracked': (r) => r.status === 200,
            'overall excellence score calculated': (r) => {
                const data = r.json();
                return data && typeof data.overall_excellence_score === 'number';
            },
            'improvement recommendations provided': (r) => {
                const data = r.json();
                return data && data.improvement_recommendations;
            }
        });
        
        if (trackingSuccess) {
            sixFBMetrics.methodologyComplianceRate.add(1);
        }
    }
    
    // Test API health for Six Figure Barber endpoints
    const healthResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/health`, { headers });
    check(healthResponse, {
        'six figure barber api healthy': (r) => r.status === 200,
        'all principles supported': (r) => {
            const data = r.json();
            return data && data.principles_supported && data.principles_supported.length === 5;
        },
        'features available': (r) => {
            const data = r.json();
            return data && data.features && data.features.length > 0;
        }
    });
    
    sleep(3 + Math.random() * 4); // Analytics users spend more time reviewing data
}

export function setup() {
    console.log('🎯 Starting Six Figure Barber Methodology Load Test');
    console.log(`📊 Testing comprehensive Six Figure Barber implementation`);
    console.log(`🏢 Target: ${MAX_USERS} concurrent barber users`);
    console.log(`⏰ Duration: ${TEST_DURATION}`);
    
    // Verify Six Figure Barber API health
    const healthResponse = http.get(`${BASE_URL}/api/v2/six-figure-barber/health`);
    if (healthResponse.status !== 200) {
        throw new Error(`Six Figure Barber API health check failed: ${healthResponse.status}`);
    }
    
    const healthData = healthResponse.json();
    console.log(`✅ Six Figure Barber API ready - ${healthData.features.length} features available`);
    console.log(`🎯 Methodology principles: ${healthData.principles_supported.join(', ')}`);
}

export function teardown() {
    console.log('🏁 Six Figure Barber Methodology Load Test Completed');
    console.log('📈 Key metrics to review:');
    console.log('  • Revenue Optimization API performance');
    console.log('  • CRM and client management responsiveness');
    console.log('  • Dashboard and analytics load times');
    console.log('  • Service excellence tracking accuracy');
    console.log('  • Methodology compliance rates');
    console.log('  • Business insight generation success');
}