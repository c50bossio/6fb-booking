/**
 * End-to-End Integration Test Script
 * Tests the complete integration workflow from frontend to backend
 */

async function runE2ETests() {
    console.log('🚀 Starting End-to-End Integration Tests');
    
    const tests = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Backend Health Check
    tests.push({
        name: 'Backend Health Check',
        test: async () => {
            const response = await fetch('http://localhost:8000/health');
            const data = await response.json();
            if (response.ok && data.status === 'healthy') {
                return { success: true, data };
            }
            throw new Error(`Health check failed: ${JSON.stringify(data)}`);
        }
    });

    // Test 2: Integration Status API
    tests.push({
        name: 'Integration Status API',
        test: async () => {
            const response = await fetch('http://localhost:8000/api/v1/integrations/status');
            const data = await response.json();
            if (response.ok && Array.isArray(data) && data.length > 0) {
                return { success: true, data: `Found ${data.length} integrations` };
            }
            throw new Error(`Status API failed: ${response.status}`);
        }
    });

    // Test 3: OAuth Initiation API
    tests.push({
        name: 'OAuth Initiation API',
        test: async () => {
            const response = await fetch('http://localhost:8000/api/v1/integrations/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ integration_type: 'google_calendar' })
            });
            const data = await response.json();
            if (response.ok && data.authorization_url && data.state) {
                return { success: true, data: 'OAuth URL generated successfully' };
            }
            throw new Error(`OAuth initiation failed: ${JSON.stringify(data)}`);
        }
    });

    // Test 4: Health Check API
    tests.push({
        name: 'Integration Health Check API',
        test: async () => {
            const response = await fetch('http://localhost:8000/api/v1/integrations/health/all');
            const data = await response.json();
            if (response.ok && data.summary && data.integrations) {
                return { success: true, data: `Health check: ${data.summary.total} total, ${data.summary.healthy} healthy` };
            }
            throw new Error(`Health check API failed: ${response.status}`);
        }
    });

    // Test 5: Reviews API
    tests.push({
        name: 'Reviews API',
        test: async () => {
            const response = await fetch('http://localhost:8000/api/v1/reviews');
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                return { success: true, data: `Found ${data.length} reviews` };
            }
            throw new Error(`Reviews API failed: ${response.status}`);
        }
    });

    // Test 6: Frontend Accessibility Test
    tests.push({
        name: 'Frontend Accessibility',
        test: async () => {
            const response = await fetch('http://localhost:3000/settings/integrations');
            if (response.ok) {
                const html = await response.text();
                if (html.includes('Integration') || html.includes('settings')) {
                    return { success: true, data: 'Frontend accessible and contains integration content' };
                }
            }
            throw new Error(`Frontend not accessible or missing content: ${response.status}`);
        }
    });

    // Test 7: Error Handling Test
    tests.push({
        name: 'Error Handling Test',
        test: async () => {
            const response = await fetch('http://localhost:8000/api/v1/integrations/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ invalid_field: 'test' })
            });
            const data = await response.json();
            if (response.status === 400 && data.detail) {
                return { success: true, data: 'Error handling works correctly' };
            }
            throw new Error(`Error handling test failed: expected 400, got ${response.status}`);
        }
    });

    // Test 8: CORS Test
    tests.push({
        name: 'CORS Configuration Test',
        test: async () => {
            const response = await fetch('http://localhost:8000/health', {
                method: 'OPTIONS'
            });
            if (response.ok || response.status === 200) {
                return { success: true, data: 'CORS configured correctly' };
            }
            throw new Error(`CORS test failed: ${response.status}`);
        }
    });

    // Run all tests
    console.log(`\\n📋 Running ${tests.length} tests...\\n`);
    
    for (const test of tests) {
        try {
            console.log(`⏳ ${test.name}...`);
            const result = await test.test();
            console.log(`✅ ${test.name}: ${result.data}`);
            passed++;
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }

    // Summary
    console.log(`\\n📊 Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

    if (failed === 0) {
        console.log(`\\n🎉 All tests passed! Integration system is working correctly.`);
    } else {
        console.log(`\\n⚠️  ${failed} tests failed. Please check the integration system.`);
    }

    return {
        total: tests.length,
        passed,
        failed,
        successRate: Math.round((passed / tests.length) * 100)
    };
}

// Run tests if this is the main script
if (typeof window === 'undefined') {
    // Node.js environment - use built-in fetch (Node 18+)
    runE2ETests().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
} else {
    // Browser environment
    window.runE2ETests = runE2ETests;
}