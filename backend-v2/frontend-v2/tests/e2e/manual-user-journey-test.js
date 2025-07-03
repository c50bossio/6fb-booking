/**
 * Manual User Journey Testing Script
 * 
 * Simplified testing approach for immediate feedback
 * Tests core functionality without complex automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const CONFIG = {
    baseUrl: 'http://localhost:3001',
    timeout: 10000,
    headless: false,
    slowMo: 500
};

class ManualJourneyTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting manual user journey testing...');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(CONFIG.timeout);
        
        // Listen for console errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });
        
        this.page.on('pageerror', error => {
            console.log(`❌ Page Error: ${error.message}`);
        });
    }

    async testStep(stepName, testFunction) {
        console.log(`\n📍 Testing: ${stepName}`);
        const startTime = Date.now();
        
        try {
            await testFunction();
            const duration = Date.now() - startTime;
            console.log(`✅ ${stepName} - SUCCESS (${duration}ms)`);
            
            this.results.push({
                step: stepName,
                success: true,
                duration: duration,
                url: this.page.url()
            });
            
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ ${stepName} - FAILED (${duration}ms): ${error.message}`);
            
            this.results.push({
                step: stepName,
                success: false,
                duration: duration,
                error: error.message,
                url: this.page.url()
            });
            
            return false;
        }
    }

    async waitForPageLoad() {
        try {
            await this.page.waitForSelector('body', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            // Fallback to basic load wait
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async runBasicTests() {
        await this.init();
        
        // Test 1: Homepage Load
        await this.testStep('Homepage Load', async () => {
            await this.page.goto(CONFIG.baseUrl);
            await this.waitForPageLoad();
            
            // Check if page loaded
            const title = await this.page.title();
            if (!title || title.includes('Error')) {
                throw new Error('Homepage failed to load properly');
            }
        });
        
        // Test 2: Navigation Check
        await this.testStep('Navigation Check', async () => {
            // Check if main navigation elements exist
            const nav = await this.page.$('nav, .navigation, .navbar');
            if (!nav) {
                throw new Error('No navigation found');
            }
            
            // Check for common links
            const commonLinks = ['dashboard', 'login', 'register', 'book'];
            let foundLinks = 0;
            
            for (const link of commonLinks) {
                const element = await this.page.$(`a[href*="${link}"]`);
                if (element) foundLinks++;
            }
            
            if (foundLinks === 0) {
                throw new Error('No common navigation links found');
            }
        });
        
        // Test 3: Login Page Access
        await this.testStep('Login Page Access', async () => {
            // Try to find and click login link
            const loginLink = await this.page.$('a[href*="login"]');
            if (loginLink) {
                await loginLink.click();
                await this.waitForPageLoad();
            } else {
                await this.page.goto(`${CONFIG.baseUrl}/login`);
                await this.waitForPageLoad();
            }
            
            // Check if login form exists
            const emailInput = await this.page.$('input[type="email"], input[name="email"]');
            const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
            
            if (!emailInput || !passwordInput) {
                throw new Error('Login form not found');
            }
        });
        
        // Test 4: Register Page Access
        await this.testStep('Register Page Access', async () => {
            // Try to find and click register link
            const registerLink = await this.page.$('a[href*="register"]');
            if (registerLink) {
                await registerLink.click();
                await this.waitForPageLoad();
            } else {
                await this.page.goto(`${CONFIG.baseUrl}/register`);
                await this.waitForPageLoad();
            }
            
            // Check if register form exists
            const emailInput = await this.page.$('input[type="email"], input[name="email"]');
            const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
            
            if (!emailInput || !passwordInput) {
                throw new Error('Register form not found');
            }
        });
        
        // Test 5: Booking Page Access
        await this.testStep('Booking Page Access', async () => {
            // Try to access booking page
            await this.page.goto(`${CONFIG.baseUrl}/book`);
            await this.waitForPageLoad();
            
            // Check if booking elements exist
            const bookingForm = await this.page.$('form, .booking-form, .service-selection');
            if (!bookingForm) {
                throw new Error('Booking form not found');
            }
        });
        
        // Test 6: Calendar Page Access
        await this.testStep('Calendar Page Access', async () => {
            // Try to access calendar page
            await this.page.goto(`${CONFIG.baseUrl}/calendar`);
            await this.waitForPageLoad();
            
            // Check if calendar elements exist
            const calendar = await this.page.$('.calendar, .fc-view, .rbc-calendar');
            if (!calendar) {
                throw new Error('Calendar component not found');
            }
        });
        
        // Test 7: Dashboard Page Access
        await this.testStep('Dashboard Page Access', async () => {
            // Try to access dashboard page
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`);
            await this.waitForPageLoad();
            
            // Check if dashboard elements exist
            const dashboard = await this.page.$('.dashboard, .dashboard-content, .user-dashboard');
            if (!dashboard) {
                throw new Error('Dashboard component not found');
            }
        });
        
        // Test 8: Mobile Responsiveness
        await this.testStep('Mobile Responsiveness', async () => {
            // Test mobile viewport
            await this.page.setViewport({ width: 375, height: 812 });
            await this.page.goto(CONFIG.baseUrl);
            await this.waitForPageLoad();
            
            // Check if mobile navigation exists
            const mobileNav = await this.page.$('.mobile-nav, .hamburger, .menu-toggle');
            const responsiveLayout = await this.page.$('.responsive, .mobile-friendly');
            
            if (!mobileNav && !responsiveLayout) {
                throw new Error('Mobile navigation not found');
            }
            
            // Reset viewport
            await this.page.setViewport({ width: 1920, height: 1080 });
        });
        
        // Test 9: API Connectivity
        await this.testStep('API Connectivity', async () => {
            // Check if API calls are working
            const response = await this.page.evaluate(async () => {
                try {
                    const res = await fetch('http://localhost:8000/');
                    return res.ok;
                } catch (error) {
                    return false;
                }
            });
            
            if (!response) {
                throw new Error('API connectivity failed');
            }
        });
        
        // Test 10: Error Handling
        await this.testStep('Error Handling', async () => {
            // Try to access non-existent page
            await this.page.goto(`${CONFIG.baseUrl}/non-existent-page`);
            await this.waitForPageLoad();
            
            // Check if error page is shown
            const errorPage = await this.page.$('.error-page, .not-found, .404');
            const errorText = await this.page.$eval('body', el => el.textContent.toLowerCase());
            
            if (!errorPage && !errorText.includes('not found') && !errorText.includes('error')) {
                throw new Error('Error handling not working');
            }
        });
        
        await this.browser.close();
        this.generateReport();
    }

    generateReport() {
        const successCount = this.results.filter(r => r.success).length;
        const failCount = this.results.filter(r => !r.success).length;
        const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
        
        console.log('\n📊 MANUAL TEST REPORT');
        console.log('=====================');
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Passed: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`Success Rate: ${Math.round((successCount / this.results.length) * 100)}%`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Average Duration: ${Math.round(totalDuration / this.results.length)}ms`);
        
        console.log('\n📋 DETAILED RESULTS:');
        this.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.step} (${result.duration}ms)`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.url) {
                console.log(`   URL: ${result.url}`);
            }
        });
        
        // Save results to file
        const reportPath = `./test-reports/manual-test-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.length,
                passed: successCount,
                failed: failCount,
                successRate: Math.round((successCount / this.results.length) * 100),
                totalDuration: totalDuration,
                averageDuration: Math.round(totalDuration / this.results.length)
            },
            results: this.results
        }, null, 2));
        
        console.log(`\n📄 Report saved to: ${reportPath}`);
        
        // Generate recommendations
        this.generateRecommendations();
    }

    generateRecommendations() {
        const failed = this.results.filter(r => !r.success);
        
        if (failed.length === 0) {
            console.log('\n🎉 ALL TESTS PASSED! System is ready for full user testing.');
            return;
        }
        
        console.log('\n🔧 RECOMMENDATIONS:');
        
        failed.forEach(result => {
            console.log(`\n❌ ${result.step}:`);
            console.log(`   Issue: ${result.error}`);
            
            // Generate specific recommendations
            if (result.step.includes('Homepage')) {
                console.log('   Fix: Check server configuration and routing');
            } else if (result.step.includes('Navigation')) {
                console.log('   Fix: Verify navigation component is properly rendered');
            } else if (result.step.includes('Login') || result.step.includes('Register')) {
                console.log('   Fix: Ensure authentication forms are properly configured');
            } else if (result.step.includes('Booking')) {
                console.log('   Fix: Verify booking components and service data');
            } else if (result.step.includes('Calendar')) {
                console.log('   Fix: Check calendar library integration');
            } else if (result.step.includes('Dashboard')) {
                console.log('   Fix: Verify dashboard routing and components');
            } else if (result.step.includes('Mobile')) {
                console.log('   Fix: Implement responsive design components');
            } else if (result.step.includes('API')) {
                console.log('   Fix: Ensure backend server is running on port 8000');
            } else if (result.step.includes('Error')) {
                console.log('   Fix: Implement proper error pages and handling');
            }
        });
        
        console.log('\n🎯 PRIORITY ACTIONS:');
        console.log('1. Fix any server/API connectivity issues first');
        console.log('2. Ensure core pages (homepage, login, register) are accessible');
        console.log('3. Verify booking and calendar functionality');
        console.log('4. Test mobile responsiveness');
        console.log('5. Implement proper error handling');
    }
}

// Run the manual tests
async function main() {
    const tester = new ManualJourneyTester();
    await tester.runBasicTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ManualJourneyTester;