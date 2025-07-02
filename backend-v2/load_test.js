/**
 * Basic Load Testing Suite
 * Tests system performance under concurrent load
 */

async function runLoadTests() {
    console.log('⚡ Starting Basic Load Testing');
    
    const tests = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Sustained load test
    tests.push({
        name: 'Sustained Load Test (50 requests)',
        test: async () => {
            const startTime = Date.now();
            const promises = Array(50).fill().map((_, i) => 
                fetch('http://localhost:8000/api/v1/integrations/status')
                    .then(r => ({ status: r.status, index: i, time: Date.now() }))
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const successCount = results.filter(r => r.status === 200).length;
            const avgTime = totalTime / 50;
            
            if (successCount >= 45 && avgTime < 1000) { // Allow some failures, require < 1s avg
                return { 
                    success: true, 
                    data: `${successCount}/50 successful in ${totalTime}ms (avg: ${avgTime.toFixed(1)}ms/req)` 
                };
            }
            throw new Error(`Load test failed: ${successCount}/50 successful, avg time: ${avgTime.toFixed(1)}ms`);
        }
    });

    // Test 2: Burst load test
    tests.push({
        name: 'Burst Load Test (100 concurrent requests)',
        test: async () => {
            const startTime = Date.now();
            const promises = Array(100).fill().map(() => 
                fetch('http://localhost:8000/health')
                    .then(r => r.status)
                    .catch(() => 500)
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const successCount = results.filter(status => status === 200).length;
            
            if (successCount >= 90 && totalTime < 5000) { // 90% success rate, under 5s
                return { 
                    success: true, 
                    data: `${successCount}/100 successful in ${totalTime}ms` 
                };
            }
            throw new Error(`Burst test failed: ${successCount}/100 successful in ${totalTime}ms`);
        }
    });

    // Test 3: Mixed endpoint load
    tests.push({
        name: 'Mixed Endpoint Load Test',
        test: async () => {
            const endpoints = [
                '/health',
                '/api/v1/integrations/status',
                '/api/v1/integrations/health/all',
                '/api/v1/reviews'
            ];
            
            const startTime = Date.now();
            const promises = Array(40).fill().map((_, i) => {
                const endpoint = endpoints[i % endpoints.length];
                return fetch(`http://localhost:8000${endpoint}`)
                    .then(r => ({ endpoint, status: r.status }))
                    .catch(e => ({ endpoint, status: 500, error: e.message }));
            });
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const successCount = results.filter(r => r.status === 200).length;
            
            if (successCount >= 35) { // Allow some failures
                return { 
                    success: true, 
                    data: `${successCount}/40 mixed requests successful in ${totalTime}ms` 
                };
            }
            throw new Error(`Mixed load test failed: ${successCount}/40 successful`);
        }
    });

    // Test 4: POST request load test
    tests.push({
        name: 'POST Request Load Test',
        test: async () => {
            const startTime = Date.now();
            const promises = Array(20).fill().map((_, i) => 
                fetch('http://localhost:8000/api/v1/integrations/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ integration_type: `test_${i}` })
                }).then(r => r.status).catch(() => 500)
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const successCount = results.filter(status => status === 200).length;
            
            if (successCount >= 18) { // Allow some failures
                return { 
                    success: true, 
                    data: `${successCount}/20 POST requests successful in ${totalTime}ms` 
                };
            }
            throw new Error(`POST load test failed: ${successCount}/20 successful`);
        }
    });

    // Test 5: Memory usage simulation (large payloads)
    tests.push({
        name: 'Large Payload Stress Test',
        test: async () => {
            const largePayload = {
                integration_type: 'google_calendar',
                config: { data: 'x'.repeat(50000) }, // 50KB payload
                metadata: Array(100).fill().map((_, i) => ({ id: i, data: 'test'.repeat(100) }))
            };
            
            const startTime = Date.now();
            const promises = Array(10).fill().map(() => 
                fetch('http://localhost:8000/api/v1/integrations/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(largePayload)
                }).then(r => r.status).catch(() => 500)
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const successCount = results.filter(status => [200, 413].includes(status)).length; // Accept payload too large
            
            if (successCount >= 8) {
                return { 
                    success: true, 
                    data: `${successCount}/10 large payloads handled in ${totalTime}ms` 
                };
            }
            throw new Error(`Large payload test failed: ${successCount}/10 handled`);
        }
    });

    // Test 6: Response time consistency
    tests.push({
        name: 'Response Time Consistency',
        test: async () => {
            const responseTimes = [];
            
            for (let i = 0; i < 20; i++) {
                const start = Date.now();
                const response = await fetch('http://localhost:8000/api/v1/integrations/status');
                const end = Date.now();
                responseTimes.push(end - start);
                
                if (!response.ok) {
                    throw new Error(`Request ${i + 1} failed with status ${response.status}`);
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxTime = Math.max(...responseTimes);
            const minTime = Math.min(...responseTimes);
            const variance = maxTime - minTime;
            
            if (avgTime < 200 && variance < 500) { // Avg under 200ms, variance under 500ms
                return { 
                    success: true, 
                    data: `Avg: ${avgTime.toFixed(1)}ms, Range: ${minTime}-${maxTime}ms` 
                };
            }
            throw new Error(`Inconsistent response times: avg ${avgTime.toFixed(1)}ms, variance ${variance}ms`);
        }
    });

    // Run all tests
    console.log(`\\n📋 Running ${tests.length} load tests...\\n`);
    
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
        
        // Delay between tests to let system recover
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log(`\\n📊 Load Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

    if (failed === 0) {
        console.log(`\\n⚡ All load tests passed! System performs well under stress.`);
    } else {
        console.log(`\\n⚠️  ${failed} load tests failed. System may need performance optimization.`);
    }

    return {
        total: tests.length,
        passed,
        failed,
        successRate: Math.round((passed / tests.length) * 100)
    };
}

// Run tests
runLoadTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
    console.error('Load test runner failed:', error);
    process.exit(1);
});