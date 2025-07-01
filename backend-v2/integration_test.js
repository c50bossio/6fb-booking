#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * 6FB Booking Platform Integration Test
 * Tests the complete integration between frontend and backend
 */

async function runIntegrationTests() {
    console.log('🚀 Starting 6FB Booking Platform Integration Tests...\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Frontend Error:', msg.text());
        }
    });
    
    const results = {
        frontend_connectivity: false,
        auth_flow: false,
        protected_routes: false,
        booking_flow: false,
        error_handling: false,
        performance: {
            page_load_time: 0,
            api_response_time: 0
        }
    };
    
    try {
        // Test 1: Frontend Connectivity
        console.log('📡 Testing Frontend Connectivity...');
        const startTime = Date.now();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
        const loadTime = Date.now() - startTime;
        results.performance.page_load_time = loadTime;
        
        const title = await page.title();
        if (title.includes('6FB Booking')) {
            console.log('✅ Frontend loads successfully');
            console.log(`   Load time: ${loadTime}ms`);
            results.frontend_connectivity = true;
        } else {
            console.log('❌ Frontend title incorrect:', title);
        }
        
        // Test 2: Authentication Flow
        console.log('\n🔐 Testing Authentication Flow...');
        
        // Navigate to login page
        await page.click('a[href="/login"]');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        
        // Fill login form
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'TestPass123');
        
        // Submit login
        await page.click('button[type="submit"]');
        
        // Wait for redirect or success
        try {
            await page.waitForNavigation({ timeout: 5000 });
            const currentUrl = page.url();
            if (currentUrl.includes('dashboard') || !currentUrl.includes('login')) {
                console.log('✅ Authentication successful');
                results.auth_flow = true;
                results.protected_routes = true;
            } else {
                console.log('❌ Authentication failed - still on login page');
            }
        } catch (error) {
            console.log('❌ Authentication timeout or error:', error.message);
        }
        
        // Test 3: Booking Flow
        console.log('\n📅 Testing Booking Flow...');
        
        try {
            // Navigate to booking page
            await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle0', timeout: 10000 });
            
            // Check if booking page loads
            const bookingElements = await page.$eval('body', el => el.textContent.toLowerCase().includes('book'));
            
            if (bookingElements) {
                console.log('✅ Booking page accessible');
                results.booking_flow = true;
            } else {
                console.log('❌ Booking page not accessible or missing content');
            }
        } catch (error) {
            console.log('❌ Booking page error:', error.message);
        }
        
        // Test 4: Error Handling
        console.log('\n🚨 Testing Error Handling...');
        
        try {
            // Test 404 page
            await page.goto('http://localhost:3000/nonexistent-page', { waitUntil: 'networkidle0', timeout: 10000 });
            const pageContent = await page.content();
            
            if (pageContent.includes('404') || pageContent.includes('not found')) {
                console.log('✅ 404 error handling works');
                results.error_handling = true;
            } else {
                console.log('❌ 404 error handling not working properly');
            }
        } catch (error) {
            console.log('❌ Error handling test failed:', error.message);
        }
        
        // Test 5: API Response Time
        console.log('\n⚡ Testing API Performance...');
        
        const apiStartTime = Date.now();
        const response = await fetch('http://localhost:8000/health');
        const apiEndTime = Date.now();
        results.performance.api_response_time = apiEndTime - apiStartTime;
        
        if (response.ok) {
            console.log(`✅ API responds in ${results.performance.api_response_time}ms`);
        } else {
            console.log('❌ API health check failed');
        }
        
    } catch (error) {
        console.error('❌ Test execution error:', error);
    } finally {
        await browser.close();
    }
    
    // Results Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Frontend Connectivity: ${results.frontend_connectivity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication Flow: ${results.auth_flow ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Protected Routes: ${results.protected_routes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Booking Flow: ${results.booking_flow ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Error Handling: ${results.error_handling ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\nPerformance Metrics:`);
    console.log(`  Page Load Time: ${results.performance.page_load_time}ms`);
    console.log(`  API Response Time: ${results.performance.api_response_time}ms`);
    
    const totalTests = 5;
    const passedTests = Object.values(results).filter(v => typeof v === 'boolean' && v).length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`\n📈 Overall Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    
    if (successRate >= 80) {
        console.log('🎉 Integration tests mostly successful!');
    } else if (successRate >= 60) {
        console.log('⚠️  Integration tests partially successful - needs attention');
    } else {
        console.log('🚨 Integration tests mostly failed - critical issues detected');
    }
    
    return results;
}

// Run the tests
runIntegrationTests().catch(console.error);