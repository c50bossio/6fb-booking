// Simple Frontend Test for BookedBarber
// Tests basic page loading and identifies JavaScript errors

const puppeteer = require('puppeteer');

async function testFrontendPages() {
    console.log('🌐 Starting Frontend Page Tests...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track errors
    const errors = [];
    const consoleMessages = [];
    
    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        if (msg.type() === 'error') {
            errors.push(`Console Error: ${msg.text()}`);
        }
    });
    
    page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
    });
    
    const testResults = {
        timestamp: new Date().toISOString(),
        pages: [],
        errors: [],
        working_pages: [],
        broken_pages: []
    };
    
    // Test pages
    const pagesToTest = [
        { url: 'http://localhost:3000/', name: 'Home' },
        { url: 'http://localhost:3000/login', name: 'Login' },
        { url: 'http://localhost:3000/register', name: 'Register' },
        { url: 'http://localhost:3000/dashboard', name: 'Dashboard (should redirect)' },
        { url: 'http://localhost:3000/calendar', name: 'Calendar (should redirect)' },
        { url: 'http://localhost:3000/bookings', name: 'Bookings' },
        { url: 'http://localhost:3000/payments', name: 'Payments' },
        { url: 'http://localhost:3000/notifications', name: 'Notifications' },
        { url: 'http://localhost:3000/analytics', name: 'Analytics (should redirect)' },
        { url: 'http://localhost:3000/settings', name: 'Settings (should redirect)' }
    ];
    
    for (const pageTest of pagesToTest) {
        console.log(`\n📄 Testing ${pageTest.name} (${pageTest.url})`);
        
        const pageErrors = [];
        const startTime = Date.now();
        
        try {
            const response = await page.goto(pageTest.url, { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });
            
            const loadTime = Date.now() - startTime;
            const status = response.status();
            
            // Wait a bit for JavaScript to execute
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check for specific error elements
            const hasErrorBoundary = await page.$('.error-boundary-message');
            const hasLoadingSpinner = await page.$('[data-testid="loading-spinner"]');
            const has404 = await page.evaluate(() => document.body.textContent.includes('404'));
            const hasInternalError = await page.evaluate(() => document.body.textContent.includes('Internal Server Error'));
            
            // Get page title
            const title = await page.title();
            
            const result = {
                name: pageTest.name,
                url: pageTest.url,
                status: status,
                loadTime: loadTime,
                title: title,
                hasErrorBoundary: !!hasErrorBoundary,
                hasLoadingSpinner: !!hasLoadingSpinner,
                has404: !!has404,
                hasInternalError: !!hasInternalError,
                working: status === 200 && !hasErrorBoundary && !has404 && !hasInternalError
            };
            
            testResults.pages.push(result);
            
            if (result.working) {
                console.log(`✅ ${pageTest.name} - Status ${status} (${loadTime}ms)`);
                testResults.working_pages.push(pageTest.name);
            } else {
                console.log(`❌ ${pageTest.name} - Status ${status} (Issues detected)`);
                if (hasErrorBoundary) console.log('   🚨 Error boundary detected');
                if (has404) console.log('   🔍 404 error on page');
                if (hasInternalError) console.log('   💥 Internal server error');
                testResults.broken_pages.push(pageTest.name);
            }
            
        } catch (error) {
            console.log(`❌ ${pageTest.name} - Failed to load: ${error.message}`);
            testResults.pages.push({
                name: pageTest.name,
                url: pageTest.url,
                error: error.message,
                working: false
            });
            testResults.broken_pages.push(pageTest.name);
        }
    }
    
    // Test login functionality
    console.log('\n🔐 Testing Login Functionality...');
    try {
        await page.goto('http://localhost:3000/login');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        
        // Fill login form
        await page.type('input[type="email"]', 'admin.test@bookedbarber.com');
        await page.type('input[type="password"]', 'AdminTest123');
        
        // Submit form
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if redirected to dashboard
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
            console.log('✅ Login successful - redirected to dashboard');
            testResults.working_pages.push('Login Flow');
        } else {
            console.log(`❌ Login failed - still at ${currentUrl}`);
            testResults.broken_pages.push('Login Flow');
        }
        
    } catch (error) {
        console.log(`❌ Login test failed: ${error.message}`);
        testResults.broken_pages.push('Login Flow');
    }
    
    await browser.close();
    
    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FRONTEND FUNCTIONALITY TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Test Date: ${testResults.timestamp}`);
    console.log(`Pages Tested: ${testResults.pages.length}`);
    console.log(`Working: ${testResults.working_pages.length}`);
    console.log(`Broken: ${testResults.broken_pages.length}`);
    
    console.log('\n✅ WORKING PAGES:');
    testResults.working_pages.forEach(page => console.log(`  • ${page}`));
    
    console.log('\n❌ BROKEN PAGES:');
    testResults.broken_pages.forEach(page => console.log(`  • ${page}`));
    
    if (errors.length > 0) {
        console.log('\n🚨 JAVASCRIPT ERRORS DETECTED:');
        errors.forEach(error => console.log(`  • ${error}`));
    }
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('frontend-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n📄 Detailed report saved to: frontend-test-results.json');
}

// Run the test
testFrontendPages().catch(console.error);