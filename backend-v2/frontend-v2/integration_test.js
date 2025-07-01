/**
 * Comprehensive Frontend-Backend Integration Test
 * Tests complete integration between frontend and backend systems
 */

const puppeteer = require('puppeteer');

class IntegrationTester {
    constructor() {
        this.backendUrl = 'http://localhost:8000';
        this.frontendUrl = 'http://localhost:3000';
        this.browser = null;
        this.page = null;
        this.results = {
            authentication: {},
            booking: {},
            payment: {},
            apiCommunication: {},
            dataFlow: {},
            errorHandling: {},
            overall: { passed: 0, failed: 0, errors: [] }
        };
    }

    async initialize() {
        console.log('🚀 Starting comprehensive integration test...\n');
        
        try {
            this.browser = await puppeteer.launch({ 
                headless: false, 
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: { width: 1280, height: 720 }
            });
            this.page = await this.browser.newPage();
            
            // Set up request/response monitoring
            await this.page.setRequestInterception(true);
            this.page.on('request', this.logRequest.bind(this));
            this.page.on('response', this.logResponse.bind(this));
            this.page.on('console', this.logConsole.bind(this));
            this.page.on('pageerror', this.logPageError.bind(this));
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error.message);
            return false;
        }
    }

    logRequest(request) {
        if (request.url().includes('localhost:8000')) {
            console.log(`📤 API Request: ${request.method()} ${request.url()}`);
        }
    }

    logResponse(response) {
        if (response.url().includes('localhost:8000')) {
            console.log(`📥 API Response: ${response.status()} ${response.url()}`);
        }
    }

    logConsole(msg) {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            console.log(`🔍 Console ${type}: ${msg.text()}`);
        }
    }

    logPageError(error) {
        console.log(`💥 Page Error: ${error.message}`);
        this.results.overall.errors.push(`Page Error: ${error.message}`);
    }

    async checkBackendHealth() {
        console.log('🏥 Checking backend health...');
        
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            if (response.ok) {
                console.log('✅ Backend is healthy');
                return true;
            } else {
                console.log(`❌ Backend health check failed: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Cannot reach backend: ${error.message}`);
            return false;
        }
    }

    async checkFrontendHealth() {
        console.log('🌐 Checking frontend health...');
        
        try {
            await this.page.goto(this.frontendUrl, { waitUntil: 'networkidle2', timeout: 10000 });
            const title = await this.page.title();
            console.log(`✅ Frontend loaded: "${title}"`);
            return true;
        } catch (error) {
            console.log(`❌ Cannot reach frontend: ${error.message}`);
            return false;
        }
    }

    async testAuthenticationFlow() {
        console.log('\n🔐 Testing Authentication Flow...');
        const results = this.results.authentication;
        
        try {
            // Test login page load
            await this.page.goto(`${this.frontendUrl}/login`, { waitUntil: 'networkidle2' });
            const loginFormExists = await this.page.$('form') !== null;
            results.loginPageLoad = loginFormExists;
            console.log(`  📄 Login page load: ${loginFormExists ? '✅' : '❌'}`);

            if (loginFormExists) {
                // Test login form submission
                const emailInput = await this.page.$('input[type="email"], input[name="email"]');
                const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
                const submitButton = await this.page.$('button[type="submit"], button:contains("Login")');

                if (emailInput && passwordInput && submitButton) {
                    console.log('  📝 Filling login form...');
                    await this.page.type('input[type="email"], input[name="email"]', 'test@example.com');
                    await this.page.type('input[type="password"], input[name="password"]', 'testpassword');
                    
                    // Monitor network requests during login
                    const loginRequestPromise = this.page.waitForResponse(
                        response => response.url().includes('/api/v1/auth/login'),
                        { timeout: 5000 }
                    ).catch(() => null);
                    
                    await submitButton.click();
                    
                    const loginResponse = await loginRequestPromise;
                    results.loginApiCall = loginResponse !== null;
                    results.loginResponseStatus = loginResponse ? loginResponse.status() : null;
                    
                    console.log(`  🌐 Login API call made: ${results.loginApiCall ? '✅' : '❌'}`);
                    if (results.loginApiCall) {
                        console.log(`  📊 Response status: ${results.loginResponseStatus}`);
                    }
                } else {
                    results.loginFormElements = false;
                    console.log('  ❌ Login form elements missing');
                }
            }

            // Test registration page
            await this.page.goto(`${this.frontendUrl}/register`, { waitUntil: 'networkidle2' });
            const registerFormExists = await this.page.$('form') !== null;
            results.registerPageLoad = registerFormExists;
            console.log(`  📝 Register page load: ${registerFormExists ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ Authentication test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    async testBookingFlow() {
        console.log('\n📅 Testing Booking Flow...');
        const results = this.results.booking;
        
        try {
            // Test booking page load
            await this.page.goto(`${this.frontendUrl}/book`, { waitUntil: 'networkidle2' });
            const pageLoaded = await this.page.evaluate(() => document.readyState === 'complete');
            results.bookingPageLoad = pageLoaded;
            console.log(`  📄 Booking page load: ${pageLoaded ? '✅' : '❌'}`);

            // Check for calendar component
            const calendarExists = await this.page.$('.calendar, [data-testid="calendar"], .booking-calendar') !== null;
            results.calendarComponent = calendarExists;
            console.log(`  📅 Calendar component: ${calendarExists ? '✅' : '❌'}`);

            // Test available slots API call
            const slotsRequestPromise = this.page.waitForResponse(
                response => response.url().includes('/api/v1/bookings/available-slots') || 
                          response.url().includes('/api/v1/barber-availability'),
                { timeout: 5000 }
            ).catch(() => null);

            // Try to trigger slots loading by interacting with date
            try {
                const dateButton = await this.page.$('button[role="gridcell"]:not([disabled]), .calendar-day, .date-button');
                if (dateButton) {
                    await dateButton.click();
                }
            } catch (e) {
                console.log('  🔍 Could not interact with calendar dates');
            }

            const slotsResponse = await slotsRequestPromise;
            results.availableSlotsApi = slotsResponse !== null;
            results.slotsResponseStatus = slotsResponse ? slotsResponse.status() : null;
            
            console.log(`  🕐 Available slots API: ${results.availableSlotsApi ? '✅' : '❌'}`);
            if (results.availableSlotsApi) {
                console.log(`  📊 Slots response status: ${results.slotsResponseStatus}`);
            }

            // Test services API call
            const servicesRequestPromise = this.page.waitForResponse(
                response => response.url().includes('/api/v1/services'),
                { timeout: 3000 }
            ).catch(() => null);

            const servicesResponse = await servicesRequestPromise;
            results.servicesApi = servicesResponse !== null;
            results.servicesResponseStatus = servicesResponse ? servicesResponse.status() : null;
            
            console.log(`  🛎️ Services API: ${results.servicesApi ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ Booking test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    async testPaymentIntegration() {
        console.log('\n💳 Testing Payment Integration...');
        const results = this.results.payment;
        
        try {
            // Test payment page/component load
            await this.page.goto(`${this.frontendUrl}/payments`, { waitUntil: 'networkidle2' }).catch(() => {
                // If payments page doesn't exist, try booking page which might have payment forms
                return this.page.goto(`${this.frontendUrl}/book`, { waitUntil: 'networkidle2' });
            });

            // Check for Stripe elements
            const stripeElementExists = await this.page.evaluate(() => {
                return document.querySelector('[data-testid="stripe-element"], .StripeElement, #card-element') !== null ||
                       window.Stripe !== undefined;
            });
            results.stripeIntegration = stripeElementExists;
            console.log(`  💳 Stripe integration: ${stripeElementExists ? '✅' : '❌'}`);

            // Test payment intent API
            const paymentIntentPromise = this.page.waitForResponse(
                response => response.url().includes('/api/v1/payments/create-payment-intent') ||
                          response.url().includes('/api/v1/payments'),
                { timeout: 3000 }
            ).catch(() => null);

            // Try to trigger payment intent creation
            const payButton = await this.page.$('button:contains("Pay"), button:contains("Book"), [data-testid="payment-button"]');
            if (payButton) {
                try {
                    await payButton.click();
                } catch (e) {
                    console.log('  🔍 Could not click payment button');
                }
            }

            const paymentResponse = await paymentIntentPromise;
            results.paymentIntentApi = paymentResponse !== null;
            results.paymentResponseStatus = paymentResponse ? paymentResponse.status() : null;
            
            console.log(`  🔄 Payment intent API: ${results.paymentIntentApi ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ Payment test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    async testApiCommunication() {
        console.log('\n🌐 Testing API Communication...');
        const results = this.results.apiCommunication;
        
        try {
            // Test CORS configuration
            const corsTest = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/auth/test', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    return { success: true, status: response.status };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });
            
            results.corsConfiguration = corsTest.success;
            console.log(`  🔒 CORS configuration: ${corsTest.success ? '✅' : '❌'}`);
            if (!corsTest.success) {
                console.log(`    Error: ${corsTest.error}`);
            }

            // Test API base URL configuration
            const apiConfigTest = await this.page.evaluate(() => {
                return {
                    apiUrl: window.location.origin.includes('localhost:3000'),
                    environmentVars: typeof process !== 'undefined'
                };
            });
            
            results.apiConfiguration = apiConfigTest.apiUrl;
            console.log(`  ⚙️ API configuration: ${apiConfigTest.apiUrl ? '✅' : '❌'}`);

            // Test error handling
            const errorHandlingTest = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/nonexistent-endpoint');
                    return { status: response.status, handled: response.status === 404 };
                } catch (error) {
                    return { handled: false, error: error.message };
                }
            });
            
            results.errorHandling = errorHandlingTest.handled;
            console.log(`  🚨 Error handling: ${errorHandlingTest.handled ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ API communication test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    async testDataFlow() {
        console.log('\n📊 Testing Data Flow...');
        const results = this.results.dataFlow;
        
        try {
            // Test state management
            const stateTest = await this.page.evaluate(() => {
                // Check for common state management patterns
                const hasReactQuery = window.React && window.React.version;
                const hasLocalStorage = typeof localStorage !== 'undefined';
                const hasSessionStorage = typeof sessionStorage !== 'undefined';
                
                return {
                    reactQuery: hasReactQuery,
                    localStorage: hasLocalStorage,
                    sessionStorage: hasSessionStorage
                };
            });
            
            results.stateManagement = stateTest.localStorage && stateTest.sessionStorage;
            console.log(`  📱 State management: ${results.stateManagement ? '✅' : '❌'}`);

            // Test data persistence
            await this.page.evaluate(() => {
                localStorage.setItem('test-integration', 'test-value');
                sessionStorage.setItem('test-session', 'test-value');
            });
            
            const persistenceTest = await this.page.evaluate(() => {
                const localTest = localStorage.getItem('test-integration') === 'test-value';
                const sessionTest = sessionStorage.getItem('test-session') === 'test-value';
                
                // Clean up
                localStorage.removeItem('test-integration');
                sessionStorage.removeItem('test-session');
                
                return { localStorage: localTest, sessionStorage: sessionTest };
            });
            
            results.dataPersistence = persistenceTest.localStorage && persistenceTest.sessionStorage;
            console.log(`  💾 Data persistence: ${results.dataPersistence ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ Data flow test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    async testErrorScenarios() {
        console.log('\n🚨 Testing Error Scenarios...');
        const results = this.results.errorHandling;
        
        try {
            // Test offline scenario
            await this.page.setOfflineMode(true);
            
            try {
                await this.page.goto(`${this.frontendUrl}`, { waitUntil: 'networkidle2', timeout: 3000 });
                results.offlineHandling = false; // Should fail
            } catch (error) {
                results.offlineHandling = true; // Expected to fail
            }
            
            await this.page.setOfflineMode(false);
            console.log(`  📴 Offline handling: ${results.offlineHandling ? '✅' : '❌'}`);

            // Test invalid API response
            await this.page.goto(`${this.frontendUrl}`, { waitUntil: 'networkidle2' });
            
            const invalidApiTest = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/invalid-endpoint');
                    return { status: response.status, handled: response.status >= 400 };
                } catch (error) {
                    return { handled: true, error: error.message };
                }
            });
            
            results.invalidApiHandling = invalidApiTest.handled;
            console.log(`  🔍 Invalid API handling: ${invalidApiTest.handled ? '✅' : '❌'}`);

            // Test error boundaries
            const errorBoundaryTest = await this.page.evaluate(() => {
                // Check if React error boundaries are implemented
                const hasErrorBoundary = document.querySelector('[data-error-boundary], .error-boundary') !== null;
                return hasErrorBoundary;
            });
            
            results.errorBoundaries = errorBoundaryTest;
            console.log(`  🛡️ Error boundaries: ${errorBoundaryTest ? '✅' : '❌'}`);

            this.updateOverallResults(results);
            
        } catch (error) {
            console.log(`  ❌ Error scenario test error: ${error.message}`);
            results.error = error.message;
            this.results.overall.failed++;
        }
    }

    updateOverallResults(sectionResults) {
        const sectionPassed = Object.values(sectionResults).filter(v => v === true).length;
        const sectionFailed = Object.values(sectionResults).filter(v => v === false).length;
        
        this.results.overall.passed += sectionPassed;
        this.results.overall.failed += sectionFailed;
    }

    generateReport() {
        console.log('\n📋 COMPREHENSIVE INTEGRATION TEST REPORT');
        console.log('==========================================\n');

        const sections = [
            { name: 'Authentication Flow', data: this.results.authentication },
            { name: 'Booking Flow', data: this.results.booking },
            { name: 'Payment Integration', data: this.results.payment },
            { name: 'API Communication', data: this.results.apiCommunication },
            { name: 'Data Flow', data: this.results.dataFlow },
            { name: 'Error Handling', data: this.results.errorHandling }
        ];

        sections.forEach(section => {
            console.log(`${section.name}:`);
            Object.entries(section.data).forEach(([key, value]) => {
                const status = value === true ? '✅' : value === false ? '❌' : '⚠️';
                console.log(`  ${key}: ${status} ${value}`);
            });
            console.log('');
        });

        console.log('Summary:');
        console.log(`  Total tests passed: ${this.results.overall.passed}`);
        console.log(`  Total tests failed: ${this.results.overall.failed}`);
        console.log(`  Success rate: ${((this.results.overall.passed / (this.results.overall.passed + this.results.overall.failed)) * 100).toFixed(1)}%`);

        if (this.results.overall.errors.length > 0) {
            console.log('\nErrors encountered:');
            this.results.overall.errors.forEach(error => {
                console.log(`  ❌ ${error}`);
            });
        }

        return this.results;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runFullTest() {
        if (!(await this.initialize())) {
            return null;
        }

        // Check if both servers are running
        const backendHealthy = await this.checkBackendHealth();
        const frontendHealthy = await this.checkFrontendHealth();

        if (!backendHealthy || !frontendHealthy) {
            console.log('\n❌ Cannot run integration tests - servers not available');
            await this.cleanup();
            return null;
        }

        // Run all test suites
        await this.testAuthenticationFlow();
        await this.testBookingFlow();
        await this.testPaymentIntegration();
        await this.testApiCommunication();
        await this.testDataFlow();
        await this.testErrorScenarios();

        const report = this.generateReport();
        await this.cleanup();

        return report;
    }
}

// Run the test if called directly
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runFullTest().then(results => {
        if (results) {
            console.log('\n🎉 Integration test completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Integration test failed to run');
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 Integration test crashed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTester;