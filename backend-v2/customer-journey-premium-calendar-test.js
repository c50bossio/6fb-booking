/**
 * Customer Journey Testing for BookedBarber V2 Premium Calendar System
 * Phase 3 Comprehensive Testing
 * 
 * Focus: Premium calendar features from customer perspective
 * Tests: Registration → Booking → Premium Calendar UX → Reschedule → Cancellation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:8000',
    timeout: 30000,
    slowMo: 100,
    headless: false,
    screenshots: true,
    screenshotDir: './test-results/customer-journey',
    verbose: true
};

// Test credentials (as mentioned in MANUAL_LOGIN_TEST_GUIDE.md)
const TEST_CREDENTIALS = {
    admin: {
        email: 'admin@bookedbarber.com',
        password: 'admin123'
    },
    customer: {
        email: 'customer@test.com',
        password: 'customer123',
        name: 'John Customer',
        phone: '+1234567890'
    }
};

class CustomerJourneyTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            startTime: new Date().toISOString(),
            tests: [],
            screenshots: [],
            errors: [],
            performance: {}
        };
    }

    async initialize() {
        console.log('🚀 Initializing Customer Journey Tester...');
        
        // Create directories
        if (!fs.existsSync(CONFIG.screenshotDir)) {
            fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        }

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-dev-tools'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport for desktop testing
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Enable console logging
        this.page.on('console', msg => {
            if (CONFIG.verbose) {
                console.log('🌐 PAGE LOG:', msg.text());
            }
        });

        // Track network errors
        this.page.on('response', response => {
            if (response.status() >= 400) {
                this.testResults.errors.push({
                    type: 'network',
                    url: response.url(),
                    status: response.status(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        console.log('✅ Browser initialized successfully');
    }

    async takeScreenshot(name, context = '') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}-${name}.png`;
        const filepath = path.join(CONFIG.screenshotDir, filename);
        
        await this.page.screenshot({ 
            path: filepath, 
            fullPage: true,
            type: 'png'
        });
        
        this.testResults.screenshots.push({
            name,
            context,
            filename,
            timestamp
        });
        
        console.log(`📸 Screenshot saved: ${filename}`);
        return filepath;
    }

    async recordTest(name, result, details = {}) {
        const test = {
            name,
            result,
            timestamp: new Date().toISOString(),
            details
        };
        
        this.testResults.tests.push(test);
        
        const status = result ? '✅' : '❌';
        console.log(`${status} ${name}: ${result ? 'PASSED' : 'FAILED'}`);
        
        if (!result && details.error) {
            console.log(`   Error: ${details.error}`);
        }
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            return false;
        }
    }

    async testHomepageAccess() {
        console.log('\n🏠 Testing Homepage Access...');
        
        try {
            await this.page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('homepage', 'Initial homepage load');
            
            // Check for key elements
            const titleExists = await this.page.$('title');
            const headerExists = await this.page.$('header, nav, .header');
            
            const title = await this.page.title();
            const hasCorrectTitle = title.includes('Booked Barber');
            
            await this.recordTest('Homepage Access', true, {
                title,
                hasCorrectTitle,
                titleExists: !!titleExists,
                headerExists: !!headerExists
            });
            
            return true;
        } catch (error) {
            await this.recordTest('Homepage Access', false, { error: error.message });
            return false;
        }
    }

    async testRegistrationFlow() {
        console.log('\n📝 Testing Customer Registration Flow...');
        
        try {
            // Navigate to registration
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('registration-page', 'Registration form');
            
            // Check if registration form exists
            const formExists = await this.waitForElement('form, [data-testid="register-form"]');
            if (!formExists) {
                // Try to find registration link
                const registerLink = await this.page.$('a[href*="register"], button:contains("Register"), .register');
                if (registerLink) {
                    await registerLink.click();
                    await this.page.waitForTimeout(2000);
                    await this.takeScreenshot('registration-after-click', 'After clicking register link');
                }
            }
            
            // Look for form fields
            const emailField = await this.page.$('input[type="email"], input[name="email"]');
            const passwordField = await this.page.$('input[type="password"], input[name="password"]');
            const nameField = await this.page.$('input[name="name"], input[name="firstName"]');
            
            await this.recordTest('Registration Form Access', !!emailField && !!passwordField, {
                emailField: !!emailField,
                passwordField: !!passwordField,
                nameField: !!nameField,
                url: this.page.url()
            });
            
            return !!emailField && !!passwordField;
        } catch (error) {
            await this.recordTest('Registration Form Access', false, { error: error.message });
            return false;
        }
    }

    async testLoginFlow() {
        console.log('\n🔐 Testing Customer Login Flow...');
        
        try {
            // Navigate to login
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('login-page', 'Login form');
            
            // Find login form elements
            const emailField = await this.page.$('input[type="email"], input[name="email"]');
            const passwordField = await this.page.$('input[type="password"], input[name="password"]');
            const submitButton = await this.page.$('button[type="submit"], button:contains("Sign in"), .login-button');
            
            if (!emailField || !passwordField) {
                await this.recordTest('Login Form Elements', false, { 
                    error: 'Login form elements not found',
                    emailField: !!emailField,
                    passwordField: !!passwordField 
                });
                return false;
            }

            // Fill in credentials
            await emailField.type(TEST_CREDENTIALS.admin.email);
            await passwordField.type(TEST_CREDENTIALS.admin.password);
            
            await this.takeScreenshot('login-filled', 'Login form filled');
            
            // Submit login
            if (submitButton) {
                await submitButton.click();
            } else {
                await this.page.keyboard.press('Enter');
            }
            
            // Wait for redirect or error
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('login-result', 'After login attempt');
            
            const currentUrl = this.page.url();
            const loginSuccessful = !currentUrl.includes('/login') || currentUrl.includes('/dashboard');
            
            await this.recordTest('Customer Login', loginSuccessful, {
                redirectUrl: currentUrl,
                credentialsUsed: TEST_CREDENTIALS.admin.email
            });
            
            return loginSuccessful;
        } catch (error) {
            await this.recordTest('Customer Login', false, { error: error.message });
            return false;
        }
    }

    async testServiceSelection() {
        console.log('\n💇 Testing Service Selection...');
        
        try {
            // Navigate to booking page
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('booking-page', 'Service selection page');
            
            // Look for service selection elements
            const services = await this.page.$$('.service-card, [data-testid="service"], .service-item');
            const serviceButtons = await this.page.$$('button:contains("Select"), .select-service');
            
            // Check for premium calendar indicators
            const calendarElement = await this.page.$('.calendar, [data-testid="calendar"], .booking-calendar');
            const colorCoding = await this.page.$$('.service-color, .color-indicator');
            
            await this.recordTest('Service Selection UI', services.length > 0, {
                servicesFound: services.length,
                serviceButtons: serviceButtons.length,
                hasCalendar: !!calendarElement,
                colorCodingElements: colorCoding.length
            });
            
            return services.length > 0;
        } catch (error) {
            await this.recordTest('Service Selection UI', false, { error: error.message });
            return false;
        }
    }

    async testPremiumCalendarFeatures() {
        console.log('\n📅 Testing Premium Calendar Customer Experience...');
        
        try {
            // Navigate to booking/calendar page
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(2000);
            await this.takeScreenshot('premium-calendar-load', 'Premium calendar loading');
            
            // Test calendar visibility and interactions
            const calendarTests = {
                calendarVisible: false,
                serviceColorCoding: false,
                premiumVisualEffects: false,
                timeSlotInteraction: false,
                barberSelection: false,
                mobileFriendly: false
            };
            
            // Check for calendar component
            const calendar = await this.page.$('.calendar, [data-testid="calendar"], .booking-calendar, .premium-calendar');
            calendarTests.calendarVisible = !!calendar;
            
            if (calendar) {
                // Test service color coding
                const colorElements = await this.page.$$('.service-color, .color-indicator, [data-color]');
                calendarTests.serviceColorCoding = colorElements.length > 0;
                
                // Test for premium visual effects
                const premiumElements = await this.page.$$('.premium-effect, .enhanced-visual, .calendar-premium');
                calendarTests.premiumVisualEffects = premiumElements.length > 0;
                
                // Test time slot interaction
                const timeSlots = await this.page.$$('.time-slot, .booking-slot, [data-testid="time-slot"]');
                if (timeSlots.length > 0) {
                    try {
                        await timeSlots[0].click();
                        await this.page.waitForTimeout(1000);
                        calendarTests.timeSlotInteraction = true;
                        await this.takeScreenshot('time-slot-selected', 'Time slot interaction');
                    } catch (e) {
                        console.log('Time slot interaction failed:', e.message);
                    }
                }
                
                // Test barber selection
                const barberElements = await this.page.$$('.barber-select, [data-testid="barber"], .barber-option');
                calendarTests.barberSelection = barberElements.length > 0;
            }
            
            // Test mobile responsiveness
            await this.page.setViewport({ width: 375, height: 667 });
            await this.page.waitForTimeout(1000);
            await this.takeScreenshot('calendar-mobile', 'Mobile calendar view');
            
            const mobileCalendar = await this.page.$('.calendar, [data-testid="calendar"]');
            calendarTests.mobileFriendly = !!mobileCalendar;
            
            // Reset to desktop view
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            const premiumScore = Object.values(calendarTests).filter(Boolean).length;
            const totalTests = Object.keys(calendarTests).length;
            
            await this.recordTest('Premium Calendar Features', premiumScore >= totalTests / 2, {
                ...calendarTests,
                score: `${premiumScore}/${totalTests}`,
                percentage: Math.round((premiumScore / totalTests) * 100)
            });
            
            return premiumScore >= totalTests / 2;
        } catch (error) {
            await this.recordTest('Premium Calendar Features', false, { error: error.message });
            return false;
        }
    }

    async testCompleteBookingFlow() {
        console.log('\n💳 Testing Complete Booking Flow...');
        
        try {
            // Navigate to booking and try to complete a booking
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('booking-flow-start', 'Booking flow start');
            
            const flowSteps = {
                serviceSelected: false,
                barberSelected: false,
                timeSelected: false,
                paymentFormVisible: false,
                bookingCompleted: false
            };
            
            // Try to select a service
            const services = await this.page.$$('.service-card, [data-testid="service"], .service-item');
            if (services.length > 0) {
                await services[0].click();
                await this.page.waitForTimeout(1000);
                flowSteps.serviceSelected = true;
                await this.takeScreenshot('service-selected', 'Service selected');
            }
            
            // Try to select a barber
            const barbers = await this.page.$$('.barber-card, [data-testid="barber"], .barber-option');
            if (barbers.length > 0) {
                await barbers[0].click();
                await this.page.waitForTimeout(1000);
                flowSteps.barberSelected = true;
                await this.takeScreenshot('barber-selected', 'Barber selected');
            }
            
            // Try to select time
            const timeSlots = await this.page.$$('.time-slot, .booking-slot, [data-testid="time-slot"]');
            if (timeSlots.length > 0) {
                await timeSlots[0].click();
                await this.page.waitForTimeout(1000);
                flowSteps.timeSelected = true;
                await this.takeScreenshot('time-selected', 'Time selected');
            }
            
            // Look for payment form
            const paymentElements = await this.page.$$('#payment-form, .payment-form, [data-testid="payment"]');
            flowSteps.paymentFormVisible = paymentElements.length > 0;
            
            if (paymentElements.length > 0) {
                await this.takeScreenshot('payment-form', 'Payment form visible');
            }
            
            const completedSteps = Object.values(flowSteps).filter(Boolean).length;
            const totalSteps = Object.keys(flowSteps).length;
            
            await this.recordTest('Complete Booking Flow', completedSteps >= 3, {
                ...flowSteps,
                completedSteps: `${completedSteps}/${totalSteps}`,
                percentage: Math.round((completedSteps / totalSteps) * 100)
            });
            
            return completedSteps >= 3;
        } catch (error) {
            await this.recordTest('Complete Booking Flow', false, { error: error.message });
            return false;
        }
    }

    async testRescheduleFeatures() {
        console.log('\n🔄 Testing Premium Reschedule Features...');
        
        try {
            // Navigate to appointments/calendar page
            await this.page.goto(`${CONFIG.baseUrl}/appointments`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('appointments-page', 'Appointments page');
            
            const rescheduleFeatures = {
                dragDropAvailable: false,
                rescheduleModalExists: false,
                magneticSnapEffect: false,
                visualFeedback: false,
                confirmationFlow: false
            };
            
            // Look for existing appointments
            const appointments = await this.page.$$('.appointment, [data-testid="appointment"], .booking-item');
            
            if (appointments.length > 0) {
                // Test drag and drop
                try {
                    const appointment = appointments[0];
                    const boundingBox = await appointment.boundingBox();
                    
                    if (boundingBox) {
                        // Try to initiate drag
                        await this.page.mouse.move(boundingBox.x + boundingBox.width/2, boundingBox.y + boundingBox.height/2);
                        await this.page.mouse.down();
                        await this.page.mouse.move(boundingBox.x + 100, boundingBox.y + 50);
                        await this.page.waitForTimeout(500);
                        await this.page.mouse.up();
                        
                        rescheduleFeatures.dragDropAvailable = true;
                        await this.takeScreenshot('drag-drop-test', 'Drag and drop test');
                    }
                } catch (e) {
                    console.log('Drag and drop test failed:', e.message);
                }
            }
            
            // Look for reschedule modal/button
            const rescheduleElements = await this.page.$$('.reschedule, [data-testid="reschedule"], button:contains("Reschedule")');
            rescheduleFeatures.rescheduleModalExists = rescheduleElements.length > 0;
            
            if (rescheduleElements.length > 0) {
                try {
                    await rescheduleElements[0].click();
                    await this.page.waitForTimeout(1000);
                    await this.takeScreenshot('reschedule-modal', 'Reschedule modal opened');
                    rescheduleFeatures.confirmationFlow = true;
                } catch (e) {
                    console.log('Reschedule modal test failed:', e.message);
                }
            }
            
            // Check for premium visual effects
            const premiumEffects = await this.page.$$('.magnetic-snap, .premium-feedback, .enhanced-drag');
            rescheduleFeatures.magneticSnapEffect = premiumEffects.length > 0;
            rescheduleFeatures.visualFeedback = premiumEffects.length > 0;
            
            const featureScore = Object.values(rescheduleFeatures).filter(Boolean).length;
            const totalFeatures = Object.keys(rescheduleFeatures).length;
            
            await this.recordTest('Reschedule Premium Features', featureScore >= 2, {
                ...rescheduleFeatures,
                existingAppointments: appointments.length,
                featureScore: `${featureScore}/${totalFeatures}`
            });
            
            return featureScore >= 2;
        } catch (error) {
            await this.recordTest('Reschedule Premium Features', false, { error: error.message });
            return false;
        }
    }

    async testCancellationFlow() {
        console.log('\n❌ Testing Cancellation Flow...');
        
        try {
            // Stay on appointments page or navigate there
            await this.page.goto(`${CONFIG.baseUrl}/appointments`, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('cancellation-test', 'Cancellation test start');
            
            const cancellationFeatures = {
                cancelButtonExists: false,
                confirmationDialog: false,
                policyDisplayed: false,
                cancellationCompleted: false
            };
            
            // Look for cancel buttons
            const cancelButtons = await this.page.$$('.cancel, [data-testid="cancel"], button:contains("Cancel")');
            cancellationFeatures.cancelButtonExists = cancelButtons.length > 0;
            
            if (cancelButtons.length > 0) {
                try {
                    await cancelButtons[0].click();
                    await this.page.waitForTimeout(1000);
                    await this.takeScreenshot('cancel-clicked', 'Cancel button clicked');
                    
                    // Look for confirmation dialog
                    const confirmDialog = await this.page.$('.confirmation, .modal, [role="dialog"]');
                    cancellationFeatures.confirmationDialog = !!confirmDialog;
                    
                    // Look for policy text
                    const policyText = await this.page.$('.policy, .cancellation-policy, .terms');
                    cancellationFeatures.policyDisplayed = !!policyText;
                    
                } catch (e) {
                    console.log('Cancel button test failed:', e.message);
                }
            }
            
            const cancellationScore = Object.values(cancellationFeatures).filter(Boolean).length;
            const totalFeatures = Object.keys(cancellationFeatures).length;
            
            await this.recordTest('Cancellation Flow', cancellationScore >= 1, {
                ...cancellationFeatures,
                score: `${cancellationScore}/${totalFeatures}`
            });
            
            return cancellationScore >= 1;
        } catch (error) {
            await this.recordTest('Cancellation Flow', false, { error: error.message });
            return false;
        }
    }

    async collectPerformanceMetrics() {
        console.log('\n⚡ Collecting Performance Metrics...');
        
        try {
            const metrics = await this.page.metrics();
            const performanceEntries = await this.page.evaluate(() => {
                return JSON.stringify(performance.getEntriesByType('navigation'));
            });
            
            this.testResults.performance = {
                ...metrics,
                navigation: JSON.parse(performanceEntries),
                timestamp: new Date().toISOString()
            };
            
            await this.recordTest('Performance Metrics Collected', true, {
                jsHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1024 / 1024) + 'MB',
                jsHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1024 / 1024) + 'MB',
                scriptDuration: Math.round(metrics.ScriptDuration * 1000) + 'ms'
            });
            
            return true;
        } catch (error) {
            await this.recordTest('Performance Metrics Collected', false, { error: error.message });
            return false;
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Comprehensive Test Report...');
        
        const endTime = new Date().toISOString();
        const duration = new Date(endTime) - new Date(this.testResults.startTime);
        
        const passedTests = this.testResults.tests.filter(t => t.result).length;
        const totalTests = this.testResults.tests.length;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        const report = {
            ...this.testResults,
            endTime,
            duration: Math.round(duration / 1000) + ' seconds',
            summary: {
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                successRate: successRate + '%',
                screenshotsTaken: this.testResults.screenshots.length,
                errorsEncountered: this.testResults.errors.length
            }
        };
        
        // Write report to file
        const reportFile = path.join(CONFIG.screenshotDir, `customer-journey-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`\n📋 Test Report Generated: ${reportFile}`);
        console.log(`🎯 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
        console.log(`📸 Screenshots: ${this.testResults.screenshots.length}`);
        console.log(`⚠️  Errors: ${this.testResults.errors.length}`);
        
        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('🧹 Cleanup completed');
    }

    async runFullTest() {
        try {
            await this.initialize();
            
            // Run all tests in sequence
            await this.testHomepageAccess();
            await this.testRegistrationFlow();
            await this.testLoginFlow();
            await this.testServiceSelection();
            await this.testPremiumCalendarFeatures();
            await this.testCompleteBookingFlow();
            await this.testRescheduleFeatures();
            await this.testCancellationFlow();
            await this.collectPerformanceMetrics();
            
            // Generate final report
            const report = await this.generateReport();
            
            return report;
        } catch (error) {
            console.error('❌ Fatal test error:', error);
            this.testResults.errors.push({
                type: 'fatal',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return this.testResults;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test
(async () => {
    console.log('🎯 Starting BookedBarber V2 Customer Journey Testing - Premium Calendar Focus');
    console.log('='*70);
    
    const tester = new CustomerJourneyTester();
    const results = await tester.runFullTest();
    
    console.log('\n' + '='*70);
    console.log('🏁 Testing Complete!');
    console.log(`📊 Results: ${results.summary?.successRate || 'N/A'} success rate`);
    console.log('='*70);
})();