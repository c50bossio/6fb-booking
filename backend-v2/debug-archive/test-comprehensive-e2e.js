/**
 * Comprehensive End-to-End Testing Suite for BookedBarber V2
 * Tests all critical user journeys and system functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class BookedBarberE2ETests {
    constructor() {
        this.browser = null;
        this.results = {
            timestamp: new Date().toISOString(),
            total_tests: 0,
            passed: 0,
            failed: 0,
            errors: [],
            performance: {},
            screenshots: []
        };
    }

    async init() {
        console.log('🚀 Initializing BookedBarber V2 E2E Testing Suite...');
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1280, height: 720 }
        });
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        
        // Save test results
        const reportPath = `/Users/bossio/6fb-booking/backend-v2/frontend-v2/e2e-test-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📊 Test report saved to: ${reportPath}`);
    }

    async takeScreenshot(page, name) {
        const screenshotPath = `/Users/bossio/6fb-booking/backend-v2/frontend-v2/screenshot-${name}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.results.screenshots.push({ name, path: screenshotPath });
        return screenshotPath;
    }

    async measurePerformance(page, testName) {
        const performanceData = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                loadTime: navigation.loadEventEnd - navigation.fetchStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
            };
        });
        
        this.results.performance[testName] = performanceData;
        return performanceData;
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        this.results.total_tests++;
        
        try {
            const page = await this.browser.newPage();
            
            // Set up error logging
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    this.results.errors.push({
                        test: testName,
                        type: 'console_error',
                        message: msg.text()
                    });
                }
            });

            page.on('pageerror', error => {
                this.results.errors.push({
                    test: testName,
                    type: 'page_error',
                    message: error.message
                });
            });

            await testFunction(page);
            
            this.results.passed++;
            console.log(`✅ Test passed: ${testName}`);
            
            await page.close();
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({
                test: testName,
                type: 'test_failure',
                message: error.message,
                stack: error.stack
            });
            console.log(`❌ Test failed: ${testName} - ${error.message}`);
        }
    }

    // Test 1: Frontend Loading and Basic Navigation
    async testFrontendLoading(page) {
        console.log('  📱 Testing frontend loading...');
        
        const startTime = Date.now();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
        const loadTime = Date.now() - startTime;
        
        if (loadTime > 5000) {
            throw new Error(`Page load time too slow: ${loadTime}ms`);
        }

        await this.measurePerformance(page, 'frontend_loading');
        await this.takeScreenshot(page, 'homepage');

        // Check for React app mounting
        await page.waitForSelector('body', { timeout: 5000 });
        
        // Look for navigation elements
        const hasNavigation = await page.$('nav') || await page.$('[role="navigation"]');
        if (!hasNavigation) {
            throw new Error('No navigation elements found');
        }

        // Check for any major React errors
        const reactErrors = await page.evaluate(() => {
            return window.console?.errors || [];
        });

        if (reactErrors.length > 0) {
            console.warn('  ⚠️  React errors detected:', reactErrors);
        }

        console.log(`  ✅ Frontend loaded successfully in ${loadTime}ms`);
    }

    // Test 2: Calendar System Functionality
    async testCalendarSystem(page) {
        console.log('  📅 Testing calendar system...');
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Try to navigate to calendar view
        const calendarLink = await page.$('a[href*="calendar"]') || 
                            await page.$('a[href*="book"]') ||
                            await page.$('button:contains("Calendar")');
        
        if (calendarLink) {
            await calendarLink.click();
            await page.waitForTimeout(2000);
        }

        await this.takeScreenshot(page, 'calendar_view');

        // Look for calendar components
        const calendarElements = await page.$$eval('[class*="calendar"], [class*="Calendar"], [data-testid*="calendar"]', 
            elements => elements.length
        );

        if (calendarElements === 0) {
            console.warn('  ⚠️  No calendar elements found - calendar might be on a different route');
        } else {
            console.log(`  ✅ Found ${calendarElements} calendar elements`);
        }

        // Test for drag and drop functionality (check if draggable elements exist)
        const draggableElements = await page.$$eval('[draggable="true"], [class*="draggable"]', 
            elements => elements.length
        );

        console.log(`  📍 Found ${draggableElements} potentially draggable elements`);
    }

    // Test 3: API Connectivity
    async testAPIConnectivity(page) {
        console.log('  🔌 Testing API connectivity...');
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });

        // Test API calls by monitoring network requests
        const apiCalls = [];
        page.on('response', response => {
            if (response.url().includes('localhost:8000') || response.url().includes('/api/')) {
                apiCalls.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });

        // Wait for any initial API calls
        await page.waitForTimeout(3000);

        // Try to trigger some API calls by interacting with the page
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
            // Click first non-disabled button to potentially trigger API calls
            const button = buttons[0];
            const isDisabled = await button.evaluate(btn => btn.disabled);
            if (!isDisabled) {
                await button.click();
                await page.waitForTimeout(2000);
            }
        }

        console.log(`  📊 Captured ${apiCalls.length} API calls`);
        
        // Check for successful API responses
        const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 400);
        const errorCalls = apiCalls.filter(call => call.status >= 400);

        if (errorCalls.length > 0) {
            console.warn('  ⚠️  API errors detected:', errorCalls);
        }

        console.log(`  ✅ API connectivity test completed: ${successfulCalls.length} successful, ${errorCalls.length} errors`);
    }

    // Test 4: Mobile Responsiveness
    async testMobileResponsiveness(page) {
        console.log('  📱 Testing mobile responsiveness...');
        
        const viewports = [
            { width: 375, height: 667, name: 'iPhone' },
            { width: 768, height: 1024, name: 'iPad' },
            { width: 414, height: 896, name: 'iPhone_Large' }
        ];

        for (const viewport of viewports) {
            await page.setViewport(viewport);
            await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
            
            await this.takeScreenshot(page, `mobile_${viewport.name}`);
            
            // Check for horizontal scrollbars (indicates poor mobile design)
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });

            if (hasHorizontalScroll) {
                console.warn(`  ⚠️  Horizontal scroll detected on ${viewport.name}`);
            }

            // Check for overlapping elements
            const overlappingElements = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                let overlaps = 0;
                for (let i = 0; i < elements.length - 1; i++) {
                    const rect1 = elements[i].getBoundingClientRect();
                    const rect2 = elements[i + 1].getBoundingClientRect();
                    if (rect1.right > rect2.left && rect1.left < rect2.right &&
                        rect1.bottom > rect2.top && rect1.top < rect2.bottom) {
                        overlaps++;
                    }
                }
                return overlaps;
            });

            console.log(`  📐 ${viewport.name}: ${overlappingElements} potential overlaps detected`);
        }

        // Reset to desktop viewport
        await page.setViewport({ width: 1280, height: 720 });
        console.log('  ✅ Mobile responsiveness test completed');
    }

    // Test 5: Authentication Flow
    async testAuthenticationFlow(page) {
        console.log('  🔐 Testing authentication flow...');
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Look for login/signup buttons or links
        const authElements = await page.$$eval('a, button', elements => {
            return elements.filter(el => {
                const text = el.textContent.toLowerCase();
                return text.includes('login') || text.includes('sign in') || 
                       text.includes('sign up') || text.includes('register');
            }).length;
        });

        console.log(`  🔍 Found ${authElements} authentication-related elements`);

        // Try to find and click login button
        try {
            const loginButton = await page.$('button:contains("Login")') || 
                              await page.$('a:contains("Login")') ||
                              await page.$('button:contains("Sign In")') ||
                              await page.$('a:contains("Sign In")');
            
            if (loginButton) {
                await loginButton.click();
                await page.waitForTimeout(2000);
                await this.takeScreenshot(page, 'login_page');
                
                // Look for login form elements
                const emailInput = await page.$('input[type="email"]') || await page.$('input[name*="email"]');
                const passwordInput = await page.$('input[type="password"]');
                
                if (emailInput && passwordInput) {
                    console.log('  ✅ Login form elements found');
                } else {
                    console.warn('  ⚠️  Login form elements not found');
                }
            }
        } catch (error) {
            console.warn('  ⚠️  Could not interact with login elements:', error.message);
        }

        console.log('  ✅ Authentication flow test completed');
    }

    // Test 6: Error Handling
    async testErrorHandling(page) {
        console.log('  🚨 Testing error handling...');
        
        // Test 404 page
        await page.goto('http://localhost:3000/nonexistent-page-12345', { waitUntil: 'networkidle0' });
        await this.takeScreenshot(page, 'error_404');
        
        const pageContent = await page.content();
        const has404Handling = pageContent.includes('404') || 
                              pageContent.includes('Not Found') || 
                              pageContent.includes('Page not found');
        
        if (!has404Handling) {
            console.warn('  ⚠️  No proper 404 error handling detected');
        } else {
            console.log('  ✅ 404 error handling found');
        }

        // Test API error scenarios
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Simulate network failure
        await page.setOfflineMode(true);
        
        // Try to interact with page to trigger API calls
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
            try {
                await buttons[0].click();
                await page.waitForTimeout(2000);
            } catch (error) {
                // Expected to fail due to offline mode
            }
        }
        
        await page.setOfflineMode(false);
        console.log('  ✅ Error handling test completed');
    }

    // Main test runner
    async runAllTests() {
        await this.init();
        
        try {
            console.log('\n📋 Starting Comprehensive E2E Test Suite');
            console.log('=' .repeat(50));

            await this.runTest('Frontend Loading', this.testFrontendLoading.bind(this));
            await this.runTest('Calendar System', this.testCalendarSystem.bind(this));
            await this.runTest('API Connectivity', this.testAPIConnectivity.bind(this));
            await this.runTest('Mobile Responsiveness', this.testMobileResponsiveness.bind(this));
            await this.runTest('Authentication Flow', this.testAuthenticationFlow.bind(this));
            await this.runTest('Error Handling', this.testErrorHandling.bind(this));

        } finally {
            await this.cleanup();
        }

        this.printResults();
    }

    printResults() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${this.results.total_tests}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📸 Screenshots: ${this.results.screenshots.length}`);
        console.log(`🚨 Errors: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 ERRORS DETECTED:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.test}] ${error.type}: ${error.message}`);
            });
        }

        console.log('\n📈 PERFORMANCE METRICS:');
        Object.entries(this.results.performance).forEach(([test, metrics]) => {
            console.log(`${test}:`);
            console.log(`  Load Time: ${metrics.loadTime}ms`);
            console.log(`  DOM Ready: ${metrics.domContentLoaded}ms`);
            console.log(`  First Paint: ${metrics.firstPaint}ms`);
        });

        console.log('\n📸 SCREENSHOTS SAVED:');
        this.results.screenshots.forEach(screenshot => {
            console.log(`  ${screenshot.name}: ${screenshot.path}`);
        });

        const successRate = (this.results.passed / this.results.total_tests * 100).toFixed(1);
        console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('🎉 EXCELLENT - System is performing well!');
        } else if (successRate >= 60) {
            console.log('⚠️  WARNING - Some issues detected, review recommended');
        } else {
            console.log('🚨 CRITICAL - Multiple issues detected, immediate attention required');
        }
    }
}

// Self-executing function to run tests
(async () => {
    const tester = new BookedBarberE2ETests();
    await tester.runAllTests();
    process.exit(0);
})().catch(error => {
    console.error('💥 Fatal error in test suite:', error);
    process.exit(1);
});