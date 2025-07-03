/**
 * Comprehensive User Journey Testing Suite
 * 
 * Tests complete user flows for BookedBarber V2 system:
 * 1. New User Journey: Registration → Login → Dashboard → Create Appointment
 * 2. Barber Journey: Login → View Calendar → Manage Appointments → Check Analytics
 * 3. Client Journey: Login → Book Appointment → View Booking → Reschedule
 * 4. Admin Journey: Login → Manage Services → View Reports → System Settings
 * 
 * Uses Puppeteer for automated browser testing
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
    baseUrl: 'http://localhost:3001',
    apiUrl: 'http://localhost:8000',
    timeout: 30000,
    slowMo: 100,
    headless: false, // Set to true for CI/CD
    screenshots: true,
    screenshotDir: './test-screenshots/user-journeys',
    reportDir: './test-reports/user-journeys'
};

// Test data
const TEST_DATA = {
    newUser: {
        name: 'John Doe',
        email: 'john.doe.test@example.com',
        phone: '+1234567890',
        password: 'TestPassword123!'
    },
    barber: {
        email: 'barber@example.com',
        password: 'password123'
    },
    client: {
        email: 'client@example.com',
        password: 'password123'
    },
    admin: {
        email: 'admin@example.com',
        password: 'password123'
    }
};

class UserJourneyTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            testSuite: 'User Journey Testing',
            timestamp: new Date().toISOString(),
            baseUrl: CONFIG.baseUrl,
            journeys: []
        };
        this.screenshotCounter = 0;
        
        // Ensure directories exist
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = [CONFIG.screenshotDir, CONFIG.reportDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async init() {
        console.log('🚀 Starting comprehensive user journey testing...');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up page event listeners
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });
        
        this.page.on('pageerror', error => {
            console.log(`❌ Page Error: ${error.message}`);
        });
        
        this.page.on('requestfailed', request => {
            console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
        });
        
        // Set longer timeout for all operations
        this.page.setDefaultTimeout(CONFIG.timeout);
    }

    async takeScreenshot(name) {
        if (!CONFIG.screenshots) return;
        
        const filename = `${this.screenshotCounter++}-${name}-${Date.now()}.png`;
        const filepath = path.join(CONFIG.screenshotDir, filename);
        
        await this.page.screenshot({
            path: filepath,
            fullPage: true
        });
        
        console.log(`📸 Screenshot saved: ${filename}`);
        return filename;
    }

    async waitForPageLoad() {
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000); // Additional wait for dynamic content
    }

    async checkForErrors() {
        const errors = await this.page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error, .alert-error, [class*="error"]');
            return Array.from(errorElements).map(el => el.textContent.trim());
        });
        
        return errors.filter(error => error.length > 0);
    }

    async measurePerformance() {
        const metrics = await this.page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            return {
                loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
            };
        });
        
        return metrics;
    }

    // Journey 1: New User Journey
    async testNewUserJourney() {
        console.log('\n🔄 Testing New User Journey...');
        
        const journey = {
            name: 'New User Journey',
            steps: [],
            success: false,
            errors: [],
            performance: {},
            duration: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Visit homepage
            console.log('📍 Step 1: Visit homepage');
            await this.page.goto(CONFIG.baseUrl);
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-homepage');
            
            journey.steps.push({
                name: 'Visit homepage',
                success: true,
                url: CONFIG.baseUrl,
                screenshot: await this.takeScreenshot('new-user-homepage')
            });
            
            // Step 2: Navigate to registration
            console.log('📍 Step 2: Navigate to registration');
            await this.page.click('a[href="/register"], button:has-text("Sign Up"), .register-btn');
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-register-page');
            
            journey.steps.push({
                name: 'Navigate to registration',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-register-page')
            });
            
            // Step 3: Fill registration form
            console.log('📍 Step 3: Fill registration form');
            await this.page.fill('input[name="name"], input[placeholder*="name" i]', TEST_DATA.newUser.name);
            await this.page.fill('input[name="email"], input[type="email"]', TEST_DATA.newUser.email);
            await this.page.fill('input[name="phone"], input[type="tel"]', TEST_DATA.newUser.phone);
            await this.page.fill('input[name="password"], input[type="password"]', TEST_DATA.newUser.password);
            
            await this.takeScreenshot('new-user-form-filled');
            
            journey.steps.push({
                name: 'Fill registration form',
                success: true,
                screenshot: await this.takeScreenshot('new-user-form-filled')
            });
            
            // Step 4: Submit registration
            console.log('📍 Step 4: Submit registration');
            await this.page.click('button[type="submit"], .register-submit, .signup-button');
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-registration-result');
            
            journey.steps.push({
                name: 'Submit registration',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-registration-result')
            });
            
            // Step 5: Navigate to login (if not auto-logged in)
            console.log('📍 Step 5: Navigate to login');
            if (this.page.url().includes('/login') || this.page.url().includes('/register')) {
                await this.page.goto(`${CONFIG.baseUrl}/login`);
            } else {
                await this.page.click('a[href="/login"], .login-btn');
            }
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-login-page');
            
            journey.steps.push({
                name: 'Navigate to login',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-login-page')
            });
            
            // Step 6: Login with new credentials
            console.log('📍 Step 6: Login with new credentials');
            await this.page.fill('input[name="email"], input[type="email"]', TEST_DATA.newUser.email);
            await this.page.fill('input[name="password"], input[type="password"]', TEST_DATA.newUser.password);
            await this.page.click('button[type="submit"], .login-submit');
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-dashboard');
            
            journey.steps.push({
                name: 'Login with new credentials',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-dashboard')
            });
            
            // Step 7: Navigate to dashboard
            console.log('📍 Step 7: Navigate to dashboard');
            if (!this.page.url().includes('/dashboard')) {
                await this.page.click('a[href="/dashboard"], .dashboard-link');
                await this.waitForPageLoad();
            }
            await this.takeScreenshot('new-user-dashboard-loaded');
            
            journey.steps.push({
                name: 'Navigate to dashboard',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-dashboard-loaded')
            });
            
            // Step 8: Create appointment
            console.log('📍 Step 8: Create appointment');
            await this.page.click('a[href="/book"], button:has-text("Book"), .book-appointment');
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-booking-page');
            
            // Fill booking form
            await this.page.click('.service-option:first-child, .service-card:first-child');
            await this.page.click('.time-slot:first-child, .available-time:first-child');
            await this.page.fill('textarea[name="notes"], .booking-notes', 'Test appointment booking');
            await this.page.click('button[type="submit"], .book-confirm');
            await this.waitForPageLoad();
            await this.takeScreenshot('new-user-booking-confirmation');
            
            journey.steps.push({
                name: 'Create appointment',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('new-user-booking-confirmation')
            });
            
            journey.success = true;
            journey.performance = await this.measurePerformance();
            
        } catch (error) {
            console.error(`❌ New User Journey failed: ${error.message}`);
            journey.errors.push(error.message);
            journey.success = false;
            await this.takeScreenshot('new-user-journey-error');
        }
        
        journey.duration = Date.now() - startTime;
        journey.errors = journey.errors.concat(await this.checkForErrors());
        this.results.journeys.push(journey);
        
        console.log(`✅ New User Journey completed in ${journey.duration}ms`);
        return journey;
    }

    // Journey 2: Barber Journey
    async testBarberJourney() {
        console.log('\n🔄 Testing Barber Journey...');
        
        const journey = {
            name: 'Barber Journey',
            steps: [],
            success: false,
            errors: [],
            performance: {},
            duration: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Login as barber
            console.log('📍 Step 1: Login as barber');
            await this.page.goto(`${CONFIG.baseUrl}/login`);
            await this.waitForPageLoad();
            await this.page.fill('input[name="email"], input[type="email"]', TEST_DATA.barber.email);
            await this.page.fill('input[name="password"], input[type="password"]', TEST_DATA.barber.password);
            await this.page.click('button[type="submit"], .login-submit');
            await this.waitForPageLoad();
            await this.takeScreenshot('barber-login-success');
            
            journey.steps.push({
                name: 'Login as barber',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('barber-login-success')
            });
            
            // Step 2: View calendar
            console.log('📍 Step 2: View calendar');
            await this.page.click('a[href="/calendar"], .calendar-link');
            await this.waitForPageLoad();
            await this.takeScreenshot('barber-calendar-view');
            
            journey.steps.push({
                name: 'View calendar',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('barber-calendar-view')
            });
            
            // Step 3: Manage appointments
            console.log('📍 Step 3: Manage appointments');
            await this.page.click('a[href="/bookings"], .appointments-link');
            await this.waitForPageLoad();
            await this.takeScreenshot('barber-appointments-list');
            
            // Try to edit an appointment
            const editButton = await this.page.$('.edit-appointment, .appointment-edit');
            if (editButton) {
                await editButton.click();
                await this.waitForPageLoad();
                await this.takeScreenshot('barber-appointment-edit');
            }
            
            journey.steps.push({
                name: 'Manage appointments',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('barber-appointments-managed')
            });
            
            // Step 4: Check analytics
            console.log('📍 Step 4: Check analytics');
            await this.page.click('a[href="/analytics"], .analytics-link');
            await this.waitForPageLoad();
            await this.takeScreenshot('barber-analytics-dashboard');
            
            journey.steps.push({
                name: 'Check analytics',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('barber-analytics-dashboard')
            });
            
            journey.success = true;
            journey.performance = await this.measurePerformance();
            
        } catch (error) {
            console.error(`❌ Barber Journey failed: ${error.message}`);
            journey.errors.push(error.message);
            journey.success = false;
            await this.takeScreenshot('barber-journey-error');
        }
        
        journey.duration = Date.now() - startTime;
        journey.errors = journey.errors.concat(await this.checkForErrors());
        this.results.journeys.push(journey);
        
        console.log(`✅ Barber Journey completed in ${journey.duration}ms`);
        return journey;
    }

    // Journey 3: Client Journey
    async testClientJourney() {
        console.log('\n🔄 Testing Client Journey...');
        
        const journey = {
            name: 'Client Journey',
            steps: [],
            success: false,
            errors: [],
            performance: {},
            duration: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Login as client
            console.log('📍 Step 1: Login as client');
            await this.page.goto(`${CONFIG.baseUrl}/login`);
            await this.waitForPageLoad();
            await this.page.fill('input[name="email"], input[type="email"]', TEST_DATA.client.email);
            await this.page.fill('input[name="password"], input[type="password"]', TEST_DATA.client.password);
            await this.page.click('button[type="submit"], .login-submit');
            await this.waitForPageLoad();
            await this.takeScreenshot('client-login-success');
            
            journey.steps.push({
                name: 'Login as client',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('client-login-success')
            });
            
            // Step 2: Book appointment
            console.log('📍 Step 2: Book appointment');
            await this.page.click('a[href="/book"], .book-appointment');
            await this.waitForPageLoad();
            await this.takeScreenshot('client-booking-page');
            
            // Fill booking form
            await this.page.click('.service-option:first-child, .service-card:first-child');
            await this.page.click('.time-slot:first-child, .available-time:first-child');
            await this.page.fill('textarea[name="notes"], .booking-notes', 'Client test booking');
            await this.page.click('button[type="submit"], .book-confirm');
            await this.waitForPageLoad();
            await this.takeScreenshot('client-booking-confirmation');
            
            journey.steps.push({
                name: 'Book appointment',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('client-booking-confirmation')
            });
            
            // Step 3: View booking
            console.log('📍 Step 3: View booking');
            await this.page.click('a[href="/bookings"], .my-bookings');
            await this.waitForPageLoad();
            await this.takeScreenshot('client-bookings-list');
            
            journey.steps.push({
                name: 'View booking',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('client-bookings-list')
            });
            
            // Step 4: Reschedule appointment
            console.log('📍 Step 4: Reschedule appointment');
            const rescheduleButton = await this.page.$('.reschedule-appointment, .appointment-reschedule');
            if (rescheduleButton) {
                await rescheduleButton.click();
                await this.waitForPageLoad();
                await this.takeScreenshot('client-reschedule-page');
                
                // Select new time
                await this.page.click('.time-slot:nth-child(2), .available-time:nth-child(2)');
                await this.page.click('button[type="submit"], .reschedule-confirm');
                await this.waitForPageLoad();
                await this.takeScreenshot('client-reschedule-confirmation');
            }
            
            journey.steps.push({
                name: 'Reschedule appointment',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('client-reschedule-confirmation')
            });
            
            journey.success = true;
            journey.performance = await this.measurePerformance();
            
        } catch (error) {
            console.error(`❌ Client Journey failed: ${error.message}`);
            journey.errors.push(error.message);
            journey.success = false;
            await this.takeScreenshot('client-journey-error');
        }
        
        journey.duration = Date.now() - startTime;
        journey.errors = journey.errors.concat(await this.checkForErrors());
        this.results.journeys.push(journey);
        
        console.log(`✅ Client Journey completed in ${journey.duration}ms`);
        return journey;
    }

    // Journey 4: Admin Journey
    async testAdminJourney() {
        console.log('\n🔄 Testing Admin Journey...');
        
        const journey = {
            name: 'Admin Journey',
            steps: [],
            success: false,
            errors: [],
            performance: {},
            duration: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Login as admin
            console.log('📍 Step 1: Login as admin');
            await this.page.goto(`${CONFIG.baseUrl}/login`);
            await this.waitForPageLoad();
            await this.page.fill('input[name="email"], input[type="email"]', TEST_DATA.admin.email);
            await this.page.fill('input[name="password"], input[type="password"]', TEST_DATA.admin.password);
            await this.page.click('button[type="submit"], .login-submit');
            await this.waitForPageLoad();
            await this.takeScreenshot('admin-login-success');
            
            journey.steps.push({
                name: 'Login as admin',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('admin-login-success')
            });
            
            // Step 2: Manage services
            console.log('📍 Step 2: Manage services');
            await this.page.click('a[href="/admin"], .admin-panel');
            await this.waitForPageLoad();
            await this.page.click('a[href="/admin/services"], .services-management');
            await this.waitForPageLoad();
            await this.takeScreenshot('admin-services-management');
            
            journey.steps.push({
                name: 'Manage services',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('admin-services-management')
            });
            
            // Step 3: View reports
            console.log('📍 Step 3: View reports');
            await this.page.click('a[href="/admin/reports"], .reports-link');
            await this.waitForPageLoad();
            await this.takeScreenshot('admin-reports-dashboard');
            
            journey.steps.push({
                name: 'View reports',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('admin-reports-dashboard')
            });
            
            // Step 4: System settings
            console.log('📍 Step 4: System settings');
            await this.page.click('a[href="/admin/settings"], .settings-link');
            await this.waitForPageLoad();
            await this.takeScreenshot('admin-system-settings');
            
            journey.steps.push({
                name: 'System settings',
                success: true,
                url: this.page.url(),
                screenshot: await this.takeScreenshot('admin-system-settings')
            });
            
            journey.success = true;
            journey.performance = await this.measurePerformance();
            
        } catch (error) {
            console.error(`❌ Admin Journey failed: ${error.message}`);
            journey.errors.push(error.message);
            journey.success = false;
            await this.takeScreenshot('admin-journey-error');
        }
        
        journey.duration = Date.now() - startTime;
        journey.errors = journey.errors.concat(await this.checkForErrors());
        this.results.journeys.push(journey);
        
        console.log(`✅ Admin Journey completed in ${journey.duration}ms`);
        return journey;
    }

    // Critical path testing
    async testCriticalPaths() {
        console.log('\n🔄 Testing Critical Paths...');
        
        const criticalPaths = [
            {
                name: 'Authentication → Calendar → Appointment Creation → Payment',
                test: async () => {
                    // Login
                    await this.page.goto(`${CONFIG.baseUrl}/login`);
                    await this.page.fill('input[name="email"]', TEST_DATA.barber.email);
                    await this.page.fill('input[name="password"]', TEST_DATA.barber.password);
                    await this.page.click('button[type="submit"]');
                    await this.waitForPageLoad();
                    
                    // Calendar
                    await this.page.click('a[href="/calendar"]');
                    await this.waitForPageLoad();
                    
                    // Create appointment
                    await this.page.click('.create-appointment, .add-appointment');
                    await this.waitForPageLoad();
                    
                    // Payment flow
                    await this.page.click('.payment-required, .process-payment');
                    await this.waitForPageLoad();
                    
                    return true;
                }
            },
            {
                name: 'Service Management → Pricing Updates → Calendar Availability',
                test: async () => {
                    // Login as admin
                    await this.page.goto(`${CONFIG.baseUrl}/login`);
                    await this.page.fill('input[name="email"]', TEST_DATA.admin.email);
                    await this.page.fill('input[name="password"]', TEST_DATA.admin.password);
                    await this.page.click('button[type="submit"]');
                    await this.waitForPageLoad();
                    
                    // Service management
                    await this.page.click('a[href="/admin/services"]');
                    await this.waitForPageLoad();
                    
                    // Update pricing
                    await this.page.click('.edit-service:first-child');
                    await this.page.fill('input[name="price"]', '50.00');
                    await this.page.click('button[type="submit"]');
                    await this.waitForPageLoad();
                    
                    // Check calendar availability
                    await this.page.click('a[href="/calendar"]');
                    await this.waitForPageLoad();
                    
                    return true;
                }
            }
        ];
        
        for (const path of criticalPaths) {
            try {
                console.log(`📍 Testing critical path: ${path.name}`);
                await path.test();
                await this.takeScreenshot(`critical-path-${path.name.replace(/\s+/g, '-').toLowerCase()}`);
            } catch (error) {
                console.error(`❌ Critical path failed: ${path.name} - ${error.message}`);
            }
        }
    }

    // Performance testing
    async testPerformance() {
        console.log('\n🔄 Testing Performance...');
        
        const performanceTests = [
            { name: 'Homepage Load', url: CONFIG.baseUrl },
            { name: 'Dashboard Load', url: `${CONFIG.baseUrl}/dashboard` },
            { name: 'Calendar Load', url: `${CONFIG.baseUrl}/calendar` },
            { name: 'Booking Page Load', url: `${CONFIG.baseUrl}/book` }
        ];
        
        for (const test of performanceTests) {
            try {
                console.log(`📍 Testing performance: ${test.name}`);
                const startTime = Date.now();
                await this.page.goto(test.url);
                await this.waitForPageLoad();
                const loadTime = Date.now() - startTime;
                
                const metrics = await this.measurePerformance();
                
                console.log(`⏱️  ${test.name}: ${loadTime}ms`);
                console.log(`   - DOM Content Loaded: ${metrics.domContentLoaded}ms`);
                console.log(`   - First Paint: ${metrics.firstPaint}ms`);
                console.log(`   - First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
                
            } catch (error) {
                console.error(`❌ Performance test failed: ${test.name} - ${error.message}`);
            }
        }
    }

    // Mobile responsiveness testing
    async testMobileResponsiveness() {
        console.log('\n🔄 Testing Mobile Responsiveness...');
        
        const devices = [
            { name: 'iPhone 12', width: 390, height: 844 },
            { name: 'iPad', width: 768, height: 1024 },
            { name: 'Galaxy S21', width: 360, height: 800 }
        ];
        
        for (const device of devices) {
            try {
                console.log(`📱 Testing on ${device.name}`);
                await this.page.setViewport({ width: device.width, height: device.height });
                
                await this.page.goto(CONFIG.baseUrl);
                await this.waitForPageLoad();
                await this.takeScreenshot(`mobile-${device.name.replace(/\s+/g, '-').toLowerCase()}`);
                
                // Test booking flow on mobile
                await this.page.click('a[href="/book"]');
                await this.waitForPageLoad();
                await this.takeScreenshot(`mobile-booking-${device.name.replace(/\s+/g, '-').toLowerCase()}`);
                
            } catch (error) {
                console.error(`❌ Mobile test failed: ${device.name} - ${error.message}`);
            }
        }
        
        // Reset viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
    }

    // Run all tests
    async runAllTests() {
        try {
            await this.init();
            
            // Run individual user journeys
            await this.testNewUserJourney();
            await this.testBarberJourney();
            await this.testClientJourney();
            await this.testAdminJourney();
            
            // Run critical path tests
            await this.testCriticalPaths();
            
            // Run performance tests
            await this.testPerformance();
            
            // Run mobile responsiveness tests
            await this.testMobileResponsiveness();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error(`❌ Test suite failed: ${error.message}`);
            this.results.errors = this.results.errors || [];
            this.results.errors.push(error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    generateReport() {
        const report = {
            ...this.results,
            summary: {
                totalJourneys: this.results.journeys.length,
                successfulJourneys: this.results.journeys.filter(j => j.success).length,
                failedJourneys: this.results.journeys.filter(j => !j.success).length,
                totalDuration: this.results.journeys.reduce((sum, j) => sum + j.duration, 0),
                averageDuration: this.results.journeys.reduce((sum, j) => sum + j.duration, 0) / this.results.journeys.length || 0
            },
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = path.join(CONFIG.reportDir, `user-journey-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 Test Report Generated');
        console.log('========================');
        console.log(`Total Journeys: ${report.summary.totalJourneys}`);
        console.log(`Successful: ${report.summary.successfulJourneys}`);
        console.log(`Failed: ${report.summary.failedJourneys}`);
        console.log(`Total Duration: ${report.summary.totalDuration}ms`);
        console.log(`Average Duration: ${Math.round(report.summary.averageDuration)}ms`);
        console.log(`Report saved to: ${reportPath}`);
        
        // Print individual journey results
        this.results.journeys.forEach(journey => {
            console.log(`\n${journey.success ? '✅' : '❌'} ${journey.name} (${journey.duration}ms)`);
            if (journey.errors.length > 0) {
                console.log(`   Errors: ${journey.errors.join(', ')}`);
            }
        });
        
        // Print recommendations
        if (report.recommendations.length > 0) {
            console.log('\n🔧 Recommendations:');
            report.recommendations.forEach(rec => console.log(`   - ${rec}`));
        }
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for common issues
        const failedJourneys = this.results.journeys.filter(j => !j.success);
        if (failedJourneys.length > 0) {
            recommendations.push('Fix critical user journey failures before production');
        }
        
        const slowJourneys = this.results.journeys.filter(j => j.duration > 30000);
        if (slowJourneys.length > 0) {
            recommendations.push('Optimize slow user journeys (>30s)');
        }
        
        const journeysWithErrors = this.results.journeys.filter(j => j.errors.length > 0);
        if (journeysWithErrors.length > 0) {
            recommendations.push('Address error messages appearing during user journeys');
        }
        
        return recommendations;
    }
}

// Run the tests
async function main() {
    const tester = new UserJourneyTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = UserJourneyTester;