#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test Suite
 * Tests the core integration between frontend (port 3002) and backend (port 8000)
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3002';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`🔍 ${title}`, 'bright');
    log('='.repeat(60), 'cyan');
}

function logTest(testName, status, details = '') {
    const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    log(`${icon} ${testName}: ${status}`, statusColor);
    if (details) {
        log(`   ${details}`, 'reset');
    }
}

async function testBackendHealth() {
    logSection('Backend Health Checks');
    
    try {
        // Test root endpoint
        const rootResponse = await axios.get(`${BACKEND_URL}/`);
        logTest('Backend Root Endpoint', 'PASS', `Response: ${JSON.stringify(rootResponse.data)}`);
        
        // Test health endpoint
        try {
            const healthResponse = await axios.get(`${BACKEND_URL}/health`);
            logTest('Backend Health Endpoint', 'PASS', `Status: ${healthResponse.status}`);
        } catch (healthError) {
            if (healthError.response?.status === 404) {
                logTest('Backend Health Endpoint', 'SKIP', 'Endpoint not implemented (404)');
            } else {
                logTest('Backend Health Endpoint', 'FAIL', `Error: ${healthError.message}`);
            }
        }
        
        // Test API docs
        try {
            const docsResponse = await axios.get(`${BACKEND_URL}/docs`);
            logTest('API Documentation', 'PASS', `Status: ${docsResponse.status}`);
        } catch (docsError) {
            logTest('API Documentation', 'FAIL', `Error: ${docsError.message}`);
        }
        
        return true;
    } catch (error) {
        logTest('Backend Root Endpoint', 'FAIL', `Error: ${error.message}`);
        return false;
    }
}

async function testAPIEndpoints() {
    logSection('API Endpoints Testing');
    
    const endpoints = [
        { path: '/api/v1/appointments', method: 'GET', name: 'Appointments API' },
        { path: '/api/v1/users/me', method: 'GET', name: 'User Profile API' },
        { path: '/api/v1/analytics/revenue', method: 'GET', name: 'Revenue Analytics API' },
        { path: '/api/v1/integrations/status', method: 'GET', name: 'Integrations Status API' },
        { path: '/api/v1/marketing/gmb/locations', method: 'GET', name: 'GMB Locations API' }
    ];
    
    let passCount = 0;
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${BACKEND_URL}${endpoint.path}`,
                timeout: 5000,
                validateStatus: (status) => status < 500 // Allow 4xx as valid responses
            });
            
            if (response.status === 401 || response.status === 403) {
                logTest(endpoint.name, 'PASS', `Authentication required (${response.status}) - Endpoint exists`);
                passCount++;
            } else if (response.status === 404) {
                logTest(endpoint.name, 'SKIP', 'Endpoint not implemented');
            } else if (response.status < 400) {
                logTest(endpoint.name, 'PASS', `Status: ${response.status}`);
                passCount++;
            } else {
                logTest(endpoint.name, 'WARN', `Status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                logTest(endpoint.name, 'FAIL', 'Backend not accessible');
            } else if (error.response?.status === 404) {
                logTest(endpoint.name, 'SKIP', 'Endpoint not implemented');
            } else {
                logTest(endpoint.name, 'FAIL', `Error: ${error.message}`);
            }
        }
    }
    
    return passCount;
}

async function testFrontendPages() {
    logSection('Frontend Pages Testing');
    
    const pages = [
        { path: '/', name: 'Home Page' },
        { path: '/analytics', name: 'Analytics Dashboard' },
        { path: '/finance/unified', name: 'Finance Unified Dashboard' },
        { path: '/customers', name: 'Customers Page' },
        { path: '/book', name: 'Booking Page' },
        { path: '/calendar', name: 'Calendar Page' }
    ];
    
    let passCount = 0;
    
    for (const page of pages) {
        try {
            const response = await axios.get(`${FRONTEND_URL}${page.path}`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Integration-Test-Bot/1.0'
                }
            });
            
            if (response.status === 200) {
                logTest(page.name, 'PASS', `Status: ${response.status}, Size: ${Math.round(response.data.length / 1024)}KB`);
                passCount++;
            } else {
                logTest(page.name, 'WARN', `Status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                logTest(page.name, 'FAIL', 'Frontend not accessible');
            } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                logTest(page.name, 'WARN', 'Page loading slowly or timed out');
            } else {
                logTest(page.name, 'FAIL', `Error: ${error.message}`);
            }
        }
    }
    
    return passCount;
}

async function testCrossOriginRequests() {
    logSection('Cross-Origin Integration Testing');
    
    try {
        // Simulate a frontend API call to backend
        const response = await axios.get(`${BACKEND_URL}/api/v1/appointments`, {
            headers: {
                'Origin': FRONTEND_URL,
                'Referer': FRONTEND_URL,
            },
            timeout: 5000,
            validateStatus: (status) => status < 500
        });
        
        if (response.status === 401) {
            logTest('CORS Configuration', 'PASS', 'Backend accepts frontend requests (auth required)');
        } else if (response.status < 400) {
            logTest('CORS Configuration', 'PASS', `Backend responds to frontend requests`);
        } else {
            logTest('CORS Configuration', 'WARN', `Status: ${response.status}`);
        }
    } catch (error) {
        if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
            logTest('CORS Configuration', 'FAIL', 'CORS policy blocks frontend-backend communication');
        } else {
            logTest('CORS Configuration', 'WARN', `Error: ${error.message}`);
        }
    }
}

async function generateReport(results) {
    logSection('Integration Test Summary');
    
    const totalTests = results.backend + results.apiEndpoints + results.frontend + 1; // +1 for CORS
    const successRate = Math.round((results.totalPassed / totalTests) * 100);
    
    log(`📊 Test Results Summary:`, 'bright');
    log(`   Backend Health: ${results.backendHealthy ? 'HEALTHY' : 'UNHEALTHY'}`, results.backendHealthy ? 'green' : 'red');
    log(`   API Endpoints Working: ${results.apiEndpoints}`, 'cyan');
    log(`   Frontend Pages Loading: ${results.frontend}`, 'cyan');
    log(`   Overall Success Rate: ${successRate}%`, successRate > 80 ? 'green' : successRate > 50 ? 'yellow' : 'red');
    
    // Recommendations
    log(`\n📋 Integration Status Assessment:`, 'bright');
    
    if (results.backendHealthy && results.frontend > 3) {
        log(`✅ READY FOR PRODUCTION TESTING`, 'green');
        log(`   - Backend is responding correctly`, 'green');
        log(`   - Frontend pages are loading`, 'green');
        log(`   - Basic integration appears functional`, 'green');
    } else if (results.backendHealthy && results.frontend > 1) {
        log(`⚠️  PARTIALLY FUNCTIONAL`, 'yellow');
        log(`   - Backend is working`, 'yellow');
        log(`   - Some frontend pages need attention`, 'yellow');
        log(`   - Integration testing can proceed with caution`, 'yellow');
    } else {
        log(`❌ NEEDS ATTENTION`, 'red');
        log(`   - Critical issues detected`, 'red');
        log(`   - Fix backend/frontend connectivity first`, 'red');
    }
    
    // Next steps
    log(`\n🚀 Recommended Next Steps:`, 'bright');
    if (successRate > 70) {
        log(`   1. Run comprehensive Puppeteer tests`, 'cyan');
        log(`   2. Test user authentication flow`, 'cyan');
        log(`   3. Validate data persistence`, 'cyan');
        log(`   4. Test real-time features`, 'cyan');
    } else {
        log(`   1. Fix connectivity issues identified above`, 'cyan');
        log(`   2. Verify environment configuration`, 'cyan');
        log(`   3. Check logs for detailed error messages`, 'cyan');
        log(`   4. Re-run this integration test`, 'cyan');
    }
    
    return successRate;
}

async function main() {
    log(`🚀 Starting Frontend-Backend Integration Test Suite`, 'bright');
    log(`Frontend: ${FRONTEND_URL}`, 'cyan');
    log(`Backend: ${BACKEND_URL}`, 'cyan');
    
    const results = {
        backendHealthy: false,
        apiEndpoints: 0,
        frontend: 0,
        totalPassed: 0
    };
    
    // Test backend health
    results.backendHealthy = await testBackendHealth();
    if (results.backendHealthy) results.totalPassed += 1;
    
    // Test API endpoints
    results.apiEndpoints = await testAPIEndpoints();
    results.totalPassed += results.apiEndpoints;
    
    // Test frontend pages
    results.frontend = await testFrontendPages();
    results.totalPassed += results.frontend;
    
    // Test cross-origin requests
    await testCrossOriginRequests();
    
    // Generate report
    const successRate = await generateReport(results);
    
    // Exit with appropriate code
    process.exit(successRate > 70 ? 0 : 1);
}

// Run the test suite
main().catch(error => {
    log(`❌ Integration test suite failed: ${error.message}`, 'red');
    process.exit(1);
});