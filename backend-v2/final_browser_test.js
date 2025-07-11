#!/usr/bin/env node

/**
 * Final Browser Test for BookedBarber V2
 * 
 * This script automates Chrome to test key pages and functionality:
 * - Navigate to each important page
 * - Check for JavaScript errors
 * - Verify skeleton loaders appear
 * - Test responsive design
 * - Validate empty states
 * - Check navigation functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds per test

class BrowserTestRunner {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {},
            console_logs: [],
            errors: []
        };
    }

    async setup() {
        console.log('🚀 Setting up browser for testing...');
        
        try {
            this.browser = await puppeteer.launch({
                headless: false, // Show browser for visual verification
                defaultViewport: { width: 1920, height: 1080 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });

            this.page = await this.browser.newPage();
            
            // Setup console logging
            this.page.on('console', msg => {
                const logEntry = {
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: new Date().toISOString()
                };
                
                this.results.console_logs.push(logEntry);
                
                if (msg.type() === 'error') {
                    console.log(`❌ Console Error: ${msg.text()}`);
                    this.results.errors.push(logEntry);
                }
            });

            // Setup error handling
            this.page.on('pageerror', error => {
                const errorEntry = {
                    type: 'pageerror',
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                };
                
                this.results.errors.push(errorEntry);
                console.log(`❌ Page Error: ${error.message}`);
            });

            // Setup request failure logging
            this.page.on('requestfailed', request => {
                const failureEntry = {
                    type: 'request_failed',
                    url: request.url(),
                    failure: request.failure().errorText,
                    timestamp: new Date().toISOString()
                };
                
                this.results.errors.push(failureEntry);
                console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
            });

            console.log('✅ Browser setup complete');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to setup browser:', error.message);
            return false;
        }
    }

    async testPage(pagePath, testName) {
        console.log(`\n🧪 Testing: ${testName} (${pagePath})`);
        
        const testResult = {
            page: pagePath,
            name: testName,
            timestamp: new Date().toISOString(),
            success: false,
            load_time: 0,
            checks: {},
            errors: []
        };

        try {
            const startTime = Date.now();
            
            // Navigate to page
            await this.page.goto(`${FRONTEND_URL}${pagePath}`, {
                waitUntil: 'networkidle0',
                timeout: TEST_TIMEOUT
            });

            const loadTime = Date.now() - startTime;
            testResult.load_time = loadTime;

            console.log(`  ⏱️  Page loaded in ${loadTime}ms`);

            // Wait a moment for React to render
            await this.page.waitForTimeout(2000);

            // Check 1: Page title and basic content
            const title = await this.page.title();
            const hasContent = await this.page.evaluate(() => {
                return document.body.innerText.length > 100;
            });

            testResult.checks.has_title = title.length > 0;
            testResult.checks.has_content = hasContent;

            console.log(`  📄 Title: "${title}" (${testResult.checks.has_title ? '✅' : '❌'})`);
            console.log(`  📝 Content: ${hasContent ? '✅ Loaded' : '❌ Empty'}`);

            // Check 2: React/Next.js rendering
            const hasReact = await this.page.evaluate(() => {
                // Check for React-specific attributes or Next.js
                return !!(
                    document.querySelector('[data-reactroot]') ||
                    document.querySelector('#__next') ||
                    document.querySelector('[data-react-component]') ||
                    window.React ||
                    window.next
                );
            });

            testResult.checks.has_react = hasReact;
            console.log(`  ⚛️  React/Next.js: ${hasReact ? '✅ Detected' : '❌ Not detected'}`);

            // Check 3: Navigation elements
            const hasNavigation = await this.page.evaluate(() => {
                const navSelectors = ['nav', '[role="navigation"]', '.navigation', '.nav', '.sidebar'];
                return navSelectors.some(selector => document.querySelector(selector));
            });

            testResult.checks.has_navigation = hasNavigation;
            console.log(`  🧭 Navigation: ${hasNavigation ? '✅ Found' : '❌ Missing'}`);

            // Check 4: Mobile responsiveness
            await this.page.setViewport({ width: 375, height: 667 }); // iPhone size
            await this.page.waitForTimeout(1000);

            const isMobileResponsive = await this.page.evaluate(() => {
                // Check if content adapts to mobile
                const body = document.body;
                return body.scrollWidth <= window.innerWidth + 50; // Some tolerance
            });

            await this.page.setViewport({ width: 1920, height: 1080 }); // Reset to desktop
            
            testResult.checks.mobile_responsive = isMobileResponsive;
            console.log(`  📱 Mobile responsive: ${isMobileResponsive ? '✅ Yes' : '❌ No'}`);

            // Check 5: Loading states (skeleton loaders, spinners)
            const hasLoadingStates = await this.page.evaluate(() => {
                const loadingSelectors = [
                    '.skeleton', '.loading', '.spinner', 
                    '[data-loading]', '.animate-pulse',
                    '[class*="skeleton"]', '[class*="loading"]'
                ];
                return loadingSelectors.some(selector => 
                    document.querySelector(selector) || 
                    document.querySelectorAll(selector).length > 0
                );
            });

            testResult.checks.has_loading_states = hasLoadingStates;
            console.log(`  ⏳ Loading states: ${hasLoadingStates ? '✅ Found' : '❌ None found'}`);

            // Check 6: Interactive elements
            const hasInteractiveElements = await this.page.evaluate(() => {
                const interactiveSelectors = ['button', 'input', 'select', 'textarea', 'a[href]'];
                return interactiveSelectors.some(selector => 
                    document.querySelectorAll(selector).length > 0
                );
            });

            testResult.checks.has_interactive_elements = hasInteractiveElements;
            console.log(`  🖱️  Interactive elements: ${hasInteractiveElements ? '✅ Found' : '❌ None found'}`);

            // Check 7: No broken images
            const brokenImages = await this.page.evaluate(() => {
                const images = document.querySelectorAll('img');
                let broken = 0;
                images.forEach(img => {
                    if (!img.complete || img.naturalHeight === 0) {
                        broken++;
                    }
                });
                return broken;
            });

            testResult.checks.broken_images = brokenImages;
            console.log(`  🖼️  Images: ${brokenImages === 0 ? '✅ All loaded' : `❌ ${brokenImages} broken`}`);

            // Check 8: Accessibility basics
            const hasAccessibilityFeatures = await this.page.evaluate(() => {
                const a11yFeatures = [
                    document.querySelector('[alt]'),
                    document.querySelector('[aria-label]'),
                    document.querySelector('[role]'),
                    document.querySelector('label'),
                    document.querySelector('h1, h2, h3, h4, h5, h6')
                ];
                return a11yFeatures.filter(Boolean).length >= 2;
            });

            testResult.checks.has_accessibility = hasAccessibilityFeatures;
            console.log(`  ♿ Accessibility: ${hasAccessibilityFeatures ? '✅ Basic features found' : '❌ Limited features'}`);

            // Determine overall success
            const criticalChecks = [
                testResult.checks.has_content,
                testResult.checks.has_react,
                loadTime < 10000 // Less than 10 seconds
            ];

            const passedCritical = criticalChecks.filter(Boolean).length;
            testResult.success = passedCritical >= 2; // At least 2 out of 3 critical checks

            console.log(`  📊 Result: ${testResult.success ? '✅ PASSED' : '❌ FAILED'} (${passedCritical}/3 critical checks)`);

            this.results.tests.push(testResult);
            return testResult;

        } catch (error) {
            console.log(`  ❌ Test failed: ${error.message}`);
            testResult.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            this.results.tests.push(testResult);
            return testResult;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting comprehensive browser testing...');
        console.log('=' * 70);

        const testPages = [
            { path: '/', name: 'Home Page' },
            { path: '/dashboard', name: 'Dashboard' },
            { path: '/finance/analytics', name: 'Financial Analytics (New)' },
            { path: '/commissions', name: 'Commissions (Improved)' },
            { path: '/clients', name: 'Clients Management' },
            { path: '/calendar', name: 'Calendar View' },
            { path: '/settings', name: 'Settings Page' }
        ];

        for (const testPage of testPages) {
            await this.testPage(testPage.path, testPage.name);
            
            // Brief pause between tests
            await this.page.waitForTimeout(1000);
        }
    }

    generateSummary() {
        const tests = this.results.tests;
        const passed = tests.filter(t => t.success).length;
        const total = tests.length;
        const successRate = (passed / total) * 100;

        // Error analysis
        const totalErrors = this.results.errors.length;
        const jsErrors = this.results.errors.filter(e => e.type === 'error' || e.type === 'pageerror').length;
        const networkErrors = this.results.errors.filter(e => e.type === 'request_failed').length;

        // Performance analysis
        const avgLoadTime = tests.reduce((sum, t) => sum + t.load_time, 0) / tests.length;
        const maxLoadTime = Math.max(...tests.map(t => t.load_time));

        // Feature analysis
        const pagesWithReact = tests.filter(t => t.checks.has_react).length;
        const pagesWithNavigation = tests.filter(t => t.checks.has_navigation).length;
        const mobileResponsivePages = tests.filter(t => t.checks.mobile_responsive).length;
        const pagesWithLoadingStates = tests.filter(t => t.checks.has_loading_states).length;

        this.results.summary = {
            test_results: {
                total_tests: total,
                passed_tests: passed,
                failed_tests: total - passed,
                success_rate: successRate
            },
            errors: {
                total_errors: totalErrors,
                javascript_errors: jsErrors,
                network_errors: networkErrors
            },
            performance: {
                average_load_time: avgLoadTime,
                max_load_time: maxLoadTime,
                fast_pages: tests.filter(t => t.load_time < 3000).length, // Under 3 seconds
                slow_pages: tests.filter(t => t.load_time > 5000).length   // Over 5 seconds
            },
            features: {
                react_pages: pagesWithReact,
                navigation_pages: pagesWithNavigation,
                mobile_responsive_pages: mobileResponsivePages,
                loading_states_pages: pagesWithLoadingStates,
                interactive_pages: tests.filter(t => t.checks.has_interactive_elements).length
            }
        };

        return this.results.summary;
    }

    printReport() {
        const summary = this.generateSummary();
        
        console.log('\n' + '=' * 70);
        console.log('📋 FINAL BROWSER TEST REPORT');
        console.log('=' * 70);

        // Overall Score
        const successRate = summary.test_results.success_rate;
        let grade, emoji, status;
        
        if (successRate >= 90) {
            grade = 'A+'; emoji = '🎉'; status = 'EXCELLENT';
        } else if (successRate >= 80) {
            grade = 'A'; emoji = '✅'; status = 'GOOD';
        } else if (successRate >= 70) {
            grade = 'B'; emoji = '⚠️'; status = 'FAIR';
        } else if (successRate >= 50) {
            grade = 'C'; emoji = '🔧'; status = 'POOR';
        } else {
            grade = 'F'; emoji = '🚨'; status = 'CRITICAL';
        }

        console.log(`${emoji} ${status}: Overall Grade ${grade} (${successRate.toFixed(1)}%)`);
        
        // Test Results
        console.log('\n📊 Test Results:');
        console.log(`  Tests Passed: ${summary.test_results.passed_tests}/${summary.test_results.total_tests}`);
        console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
        
        // Error Summary
        console.log('\n🚨 Error Summary:');
        if (summary.errors.total_errors === 0) {
            console.log('  ✅ No errors detected!');
        } else {
            console.log(`  Total Errors: ${summary.errors.total_errors}`);
            console.log(`  JavaScript Errors: ${summary.errors.javascript_errors}`);
            console.log(`  Network Errors: ${summary.errors.network_errors}`);
        }

        // Performance
        console.log('\n⚡ Performance:');
        console.log(`  Average Load Time: ${summary.performance.average_load_time.toFixed(0)}ms`);
        console.log(`  Slowest Page: ${summary.performance.max_load_time.toFixed(0)}ms`);
        console.log(`  Fast Pages (< 3s): ${summary.performance.fast_pages}/${summary.test_results.total_tests}`);
        
        if (summary.performance.slow_pages > 0) {
            console.log(`  ⚠️  Slow Pages (> 5s): ${summary.performance.slow_pages}`);
        }

        // Features
        console.log('\n🚀 Feature Analysis:');
        console.log(`  React/Next.js Pages: ${summary.features.react_pages}/${summary.test_results.total_tests}`);
        console.log(`  Navigation Present: ${summary.features.navigation_pages}/${summary.test_results.total_tests}`);
        console.log(`  Mobile Responsive: ${summary.features.mobile_responsive_pages}/${summary.test_results.total_tests}`);
        console.log(`  Loading States: ${summary.features.loading_states_pages}/${summary.test_results.total_tests}`);
        console.log(`  Interactive Elements: ${summary.features.interactive_pages}/${summary.test_results.total_tests}`);

        // Specific Page Results
        console.log('\n📄 Page-by-Page Results:');
        this.results.tests.forEach(test => {
            const status = test.success ? '✅' : '❌';
            const loadTime = test.load_time ? `(${test.load_time}ms)` : '';
            console.log(`  ${status} ${test.name}: ${loadTime}`);
            
            if (!test.success && test.errors.length > 0) {
                console.log(`     Error: ${test.errors[0].message}`);
            }
        });

        // Key Features Validation
        console.log('\n🔍 Key Features Validation:');
        
        const financialAnalytics = this.results.tests.find(t => t.page === '/finance/analytics');
        const commissions = this.results.tests.find(t => t.page === '/commissions');
        
        if (financialAnalytics) {
            console.log(`  💰 Financial Analytics: ${financialAnalytics.success ? '✅ Working' : '❌ Issues detected'}`);
        }
        
        if (commissions) {
            console.log(`  💼 Commissions Page: ${commissions.success ? '✅ Working' : '❌ Issues detected'}`);
        }

        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (summary.errors.javascript_errors > 0) {
            console.log('  🔧 Fix JavaScript errors for better user experience');
        }
        
        if (summary.performance.slow_pages > 0) {
            console.log('  ⚡ Optimize slow-loading pages');
        }
        
        if (summary.features.mobile_responsive_pages < summary.test_results.total_tests) {
            console.log('  📱 Improve mobile responsiveness');
        }
        
        if (summary.features.loading_states_pages < summary.test_results.total_tests) {
            console.log('  ⏳ Add loading states to improve perceived performance');
        }

        if (summary.test_results.success_rate === 100 && summary.errors.total_errors === 0) {
            console.log('  🎉 Application is in excellent condition for production use!');
        }
    }

    async saveResults() {
        const filename = 'final_browser_test_results.json';
        fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed results saved to: ${filename}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }

    async run() {
        try {
            const setupSuccess = await this.setup();
            if (!setupSuccess) {
                console.error('❌ Setup failed. Exiting.');
                return;
            }

            await this.runAllTests();
            this.printReport();
            await this.saveResults();
            
        } catch (error) {
            console.error('❌ Test runner failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
async function main() {
    const testRunner = new BrowserTestRunner();
    await testRunner.run();
}

// Check if puppeteer is available
try {
    main().catch(error => {
        console.error('❌ Failed to run browser tests:', error.message);
        console.log('\n💡 To install Puppeteer:');
        console.log('   npm install puppeteer');
        process.exit(1);
    });
} catch (error) {
    console.error('❌ Puppeteer not found. Installing...');
    console.log('💡 Please run: npm install puppeteer');
    process.exit(1);
}