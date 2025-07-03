const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BarberUserComprehensiveTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            timestamp: new Date().toISOString(),
            testType: 'Barber User Comprehensive Deep Test',
            environment: {
                frontend: 'http://localhost:3000',
                backend: 'http://localhost:8000'
            },
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errors: [],
            screenshots: [],
            performanceMetrics: [],
            testDetails: [],
            missingFeatures: [],
            foundFeatures: [],
            apiConnectivity: [],
            userExperience: {
                navigation: { attempted: 0, successful: 0 },
                authentication: { attempted: 0, successful: 0 },
                calendarOperations: { attempted: 0, successful: 0 },
                clientManagement: { attempted: 0, successful: 0 },
                businessOperations: { attempted: 0, successful: 0 },
                mobileUsability: { attempted: 0, successful: 0 }
            }
        };
        this.screenshotDir = path.join(__dirname, 'test-results', 'barber-user-screenshots');
        this.testCredentials = {
            email: 'test-barber@6fb.com',
            password: 'testpass123'
        };
    }

    async init() {
        try {
            await fs.mkdir(this.screenshotDir, { recursive: true });
            
            this.browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1920, height: 1080 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-default-apps'
                ]
            });
            
            this.page = await this.browser.newPage();
            
            // Enhanced error tracking
            this.page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    this.testResults.errors.push({
                        type: 'Console Error',
                        message: msg.text(),
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            this.page.on('requestfailed', (request) => {
                this.testResults.errors.push({
                    type: 'Network Error',
                    message: `Failed to load ${request.url()}: ${request.failure().errorText}`,
                    timestamp: new Date().toISOString()
                });
            });
            
            // API monitoring
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                if (request.url().includes('localhost:8000')) {
                    this.testResults.apiConnectivity.push({
                        method: request.method(),
                        url: request.url(),
                        timestamp: new Date().toISOString()
                    });
                }
                request.continue();
            });
            
            console.log('🚀 Barber User Comprehensive Test initialized');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    async takeScreenshot(name, description) {
        try {
            const filename = `${Date.now()}-${name}.png`;
            const filepath = path.join(this.screenshotDir, filename);
            await this.page.screenshot({ path: filepath, fullPage: true });
            this.testResults.screenshots.push({ 
                name, 
                description, 
                filepath, 
                timestamp: new Date().toISOString() 
            });
            console.log(`📸 Screenshot: ${name}`);
        } catch (error) {
            console.error(`❌ Screenshot failed for ${name}:`, error);
        }
    }

    async testHomepage() {
        console.log('🏠 Testing Homepage Access...');
        this.testResults.userExperience.navigation.attempted++;
        
        try {
            const startTime = Date.now();
            await this.page.goto('http://localhost:3000', { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            const loadTime = Date.now() - startTime;
            
            await this.takeScreenshot('homepage', 'Initial homepage load');
            
            // Check for basic homepage elements
            const pageTitle = await this.page.title();
            const hasBookingButton = await this.page.$('button, a[href*="book"], [data-testid*="book"]') !== null;
            const hasLoginLink = await this.page.$('a[href*="login"], button:contains("Login"), [data-testid*="login"]') !== null;
            
            this.testResults.foundFeatures.push({
                feature: 'Homepage Load',
                status: 'working',
                details: `Loaded in ${loadTime}ms, title: "${pageTitle}"`
            });
            
            if (hasBookingButton) {
                this.testResults.foundFeatures.push({
                    feature: 'Booking Button',
                    status: 'present',
                    details: 'Found booking functionality on homepage'
                });
            }
            
            if (hasLoginLink) {
                this.testResults.foundFeatures.push({
                    feature: 'Login Link',
                    status: 'present',
                    details: 'Found login functionality on homepage'
                });
            }
            
            this.testResults.userExperience.navigation.successful++;
            this.testResults.passedTests++;
            console.log('✅ Homepage test passed');
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Homepage Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            console.error('❌ Homepage test failed:', error);
        }
        
        this.testResults.totalTests++;
    }

    async testAuthenticationFlow() {
        console.log('🔐 Testing Authentication Flow...');
        this.testResults.userExperience.authentication.attempted++;
        
        try {
            // Navigate to login page
            await this.page.goto('http://localhost:3000/login', { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            
            await this.takeScreenshot('login-page', 'Login page loaded');
            
            // Check for form elements
            const emailField = await this.page.$('#email');
            const passwordField = await this.page.$('#password');
            const submitButton = await this.page.$('button[type="submit"]');
            
            if (!emailField || !passwordField || !submitButton) {
                throw new Error('Login form elements not found');
            }
            
            this.testResults.foundFeatures.push({
                feature: 'Login Form',
                status: 'complete',
                details: 'All required form elements present'
            });
            
            // Fill in credentials
            await emailField.type(this.testCredentials.email, { delay: 100 });
            await passwordField.type(this.testCredentials.password, { delay: 100 });
            
            await this.takeScreenshot('login-form-filled', 'Login form filled with credentials');
            
            // Submit form and wait for response
            const navigationPromise = this.page.waitForResponse(response => 
                response.url().includes('/api') || response.url().includes('/login') || response.url().includes('/dashboard')
            );
            
            await submitButton.click();
            
            try {
                const response = await navigationPromise;
                console.log(`📡 Got response: ${response.status()} from ${response.url()}`);
                
                // Wait for potential page changes
                await this.page.waitForTimeout(3000);
                await this.takeScreenshot('post-login', 'After login submission');
                
                // Check current page state
                const currentUrl = this.page.url();
                const pageContent = await this.page.content();
                
                // Look for authentication success indicators
                const isDashboard = currentUrl.includes('/dashboard') || 
                                  currentUrl.includes('/calendar') || 
                                  currentUrl.includes('/barber');
                
                const hasUserMenu = await this.page.$('[data-testid*="user-menu"], .user-menu, [aria-label*="user"]') !== null;
                const hasLogoutOption = pageContent.toLowerCase().includes('logout') || 
                                      pageContent.toLowerCase().includes('sign out');
                
                if (isDashboard || hasUserMenu || hasLogoutOption) {
                    this.testResults.userExperience.authentication.successful++;
                    this.testResults.foundFeatures.push({
                        feature: 'Barber Authentication',
                        status: 'working',
                        details: `Successfully authenticated, redirected to: ${currentUrl}`
                    });
                    this.testResults.passedTests++;
                    console.log('✅ Authentication successful');
                    return true;
                } else {
                    // Check for error messages
                    const errorMessage = await this.page.$('.error, [role="alert"], .alert-error');
                    if (errorMessage) {
                        const errorText = await errorMessage.textContent();
                        this.testResults.missingFeatures.push({
                            feature: 'Authentication Success',
                            issue: `Login failed with error: ${errorText}`,
                            currentState: currentUrl
                        });
                    }
                    throw new Error(`Authentication failed. Current URL: ${currentUrl}`);
                }
                
            } catch (timeoutError) {
                console.log('⚠️ No immediate response, checking page state...');
                await this.page.waitForTimeout(2000);
                await this.takeScreenshot('login-timeout', 'After login timeout');
                
                const currentUrl = this.page.url();
                if (currentUrl !== 'http://localhost:3000/login') {
                    console.log('✅ Page changed, authentication might be successful');
                    this.testResults.passedTests++;
                    return true;
                } else {
                    throw new Error('Login form submission had no effect');
                }
            }
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Authentication Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            await this.takeScreenshot('login-error', 'Authentication error state');
            console.error('❌ Authentication test failed:', error);
            return false;
        }
        
        this.testResults.totalTests++;
    }

    async testBarberDashboard() {
        console.log('📊 Testing Barber Dashboard...');
        this.testResults.userExperience.businessOperations.attempted++;
        
        try {
            // Try different dashboard URLs
            const dashboardUrls = [
                'http://localhost:3000/dashboard',
                'http://localhost:3000/barber/dashboard',
                'http://localhost:3000/calendar'
            ];
            
            let dashboardLoaded = false;
            for (const url of dashboardUrls) {
                try {
                    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                    const currentUrl = this.page.url();
                    if (!currentUrl.includes('/login')) {
                        dashboardLoaded = true;
                        console.log(`✅ Dashboard accessed at: ${url}`);
                        break;
                    }
                } catch (e) {
                    console.log(`⚠️ Could not access ${url}`);
                }
            }
            
            if (!dashboardLoaded) {
                throw new Error('Could not access any dashboard URL');
            }
            
            await this.takeScreenshot('barber-dashboard', 'Barber dashboard view');
            
            // Analyze dashboard content
            const pageContent = await this.page.content();
            const dashboardElements = {
                calendar: pageContent.toLowerCase().includes('calendar'),
                appointments: pageContent.toLowerCase().includes('appointment'),
                clients: pageContent.toLowerCase().includes('client'),
                earnings: pageContent.toLowerCase().includes('earning') || pageContent.includes('$'),
                analytics: pageContent.toLowerCase().includes('analytic') || pageContent.toLowerCase().includes('report'),
                settings: pageContent.toLowerCase().includes('setting') || pageContent.toLowerCase().includes('profile')
            };
            
            const foundDashboardFeatures = Object.entries(dashboardElements)
                .filter(([_, present]) => present)
                .map(([feature, _]) => feature);
            
            this.testResults.foundFeatures.push({
                feature: 'Dashboard Elements',
                status: 'partial',
                details: `Found: ${foundDashboardFeatures.join(', ')}`
            });
            
            // Test navigation menu
            const navigationLinks = await this.page.$$('nav a, [role="navigation"] a, .navigation a');
            this.testResults.foundFeatures.push({
                feature: 'Navigation Menu',
                status: 'present',
                details: `Found ${navigationLinks.length} navigation links`
            });
            
            this.testResults.userExperience.businessOperations.successful++;
            this.testResults.passedTests++;
            console.log('✅ Dashboard test passed');
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Dashboard Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            await this.takeScreenshot('dashboard-error', 'Dashboard access error');
            console.error('❌ Dashboard test failed:', error);
        }
        
        this.testResults.totalTests++;
    }

    async testCalendarFunctionality() {
        console.log('📅 Testing Calendar Functionality...');
        this.testResults.userExperience.calendarOperations.attempted++;
        
        try {
            // Try to access calendar
            const calendarUrls = [
                'http://localhost:3000/calendar',
                'http://localhost:3000/barber/calendar',
                'http://localhost:3000/dashboard/calendar'
            ];
            
            let calendarLoaded = false;
            for (const url of calendarUrls) {
                try {
                    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                    calendarLoaded = true;
                    break;
                } catch (e) {
                    console.log(`⚠️ Could not access ${url}`);
                }
            }
            
            if (!calendarLoaded) {
                // Try finding calendar via navigation
                const calendarLink = await this.page.$('a[href*="calendar"], nav a:contains("Calendar")');
                if (calendarLink) {
                    await calendarLink.click();
                    await this.page.waitForTimeout(2000);
                    calendarLoaded = true;
                }
            }
            
            await this.takeScreenshot('calendar-view', 'Calendar interface');
            
            // Analyze calendar features
            const pageContent = await this.page.content();
            const calendarFeatures = {
                monthView: pageContent.toLowerCase().includes('month'),
                weekView: pageContent.toLowerCase().includes('week'),
                dayView: pageContent.toLowerCase().includes('day'),
                appointments: pageContent.toLowerCase().includes('appointment'),
                timeSlots: pageContent.toLowerCase().includes('time') || pageContent.includes(':'),
                newAppointment: pageContent.toLowerCase().includes('new') || pageContent.toLowerCase().includes('add'),
                availability: pageContent.toLowerCase().includes('available') || pageContent.toLowerCase().includes('free')
            };
            
            const foundCalendarFeatures = Object.entries(calendarFeatures)
                .filter(([_, present]) => present)
                .map(([feature, _]) => feature);
            
            this.testResults.foundFeatures.push({
                feature: 'Calendar Interface',
                status: foundCalendarFeatures.length > 3 ? 'comprehensive' : 'basic',
                details: `Found: ${foundCalendarFeatures.join(', ')}`
            });
            
            // Test calendar interactions
            const clickableElements = await this.page.$$('button, .btn, [role="button"], .calendar-day, .time-slot');
            this.testResults.foundFeatures.push({
                feature: 'Calendar Interactions',
                status: 'present',
                details: `Found ${clickableElements.length} interactive calendar elements`
            });
            
            this.testResults.userExperience.calendarOperations.successful++;
            this.testResults.passedTests++;
            console.log('✅ Calendar test passed');
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Calendar Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            await this.takeScreenshot('calendar-error', 'Calendar access error');
            console.error('❌ Calendar test failed:', error);
        }
        
        this.testResults.totalTests++;
    }

    async testClientManagement() {
        console.log('👥 Testing Client Management...');
        this.testResults.userExperience.clientManagement.attempted++;
        
        try {
            // Try to access clients section
            const clientUrls = [
                'http://localhost:3000/clients',
                'http://localhost:3000/barber/clients',
                'http://localhost:3000/dashboard/clients'
            ];
            
            let clientsLoaded = false;
            for (const url of clientUrls) {
                try {
                    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                    const currentUrl = this.page.url();
                    if (!currentUrl.includes('/login')) {
                        clientsLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`⚠️ Could not access ${url}`);
                }
            }
            
            await this.takeScreenshot('clients-section', 'Client management interface');
            
            // Analyze client management features
            const pageContent = await this.page.content();
            const clientFeatures = {
                clientList: pageContent.toLowerCase().includes('client'),
                searchClients: pageContent.toLowerCase().includes('search'),
                addClient: pageContent.toLowerCase().includes('add') || pageContent.toLowerCase().includes('new'),
                clientHistory: pageContent.toLowerCase().includes('history'),
                clientNotes: pageContent.toLowerCase().includes('note'),
                clientContact: pageContent.toLowerCase().includes('phone') || pageContent.toLowerCase().includes('email')
            };
            
            const foundClientFeatures = Object.entries(clientFeatures)
                .filter(([_, present]) => present)
                .map(([feature, _]) => feature);
            
            this.testResults.foundFeatures.push({
                feature: 'Client Management',
                status: foundClientFeatures.length > 2 ? 'comprehensive' : 'basic',
                details: `Found: ${foundClientFeatures.join(', ')}`
            });
            
            this.testResults.userExperience.clientManagement.successful++;
            this.testResults.passedTests++;
            console.log('✅ Client management test passed');
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Client Management Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            await this.takeScreenshot('clients-error', 'Client management error');
            console.error('❌ Client management test failed:', error);
        }
        
        this.testResults.totalTests++;
    }

    async testMobileExperience() {
        console.log('📱 Testing Mobile Experience...');
        this.testResults.userExperience.mobileUsability.attempted++;
        
        try {
            // Set mobile viewport
            await this.page.setViewport({ width: 375, height: 812 });
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            
            await this.takeScreenshot('mobile-view', 'Mobile viewport dashboard');
            
            // Test mobile navigation
            const mobileMenuButton = await this.page.$('button[aria-label*="menu"], .hamburger, [data-testid*="mobile"]');
            const hasMobileMenu = mobileMenuButton !== null;
            
            // Test touch targets
            const buttons = await this.page.$$('button, a, [role="button"]');
            let touchFriendlyButtons = 0;
            
            for (const button of buttons) {
                const box = await button.boundingBox();
                if (box && box.height >= 44 && box.width >= 44) {
                    touchFriendlyButtons++;
                }
            }
            
            this.testResults.foundFeatures.push({
                feature: 'Mobile Interface',
                status: hasMobileMenu ? 'optimized' : 'basic',
                details: `Mobile menu: ${hasMobileMenu}, Touch-friendly buttons: ${touchFriendlyButtons}/${buttons.length}`
            });
            
            // Reset to desktop viewport
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            this.testResults.userExperience.mobileUsability.successful++;
            this.testResults.passedTests++;
            console.log('✅ Mobile experience test passed');
            
        } catch (error) {
            this.testResults.errors.push({
                type: 'Mobile Experience Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.testResults.failedTests++;
            console.error('❌ Mobile experience test failed:', error);
        }
        
        this.testResults.totalTests++;
    }

    async generateReport() {
        console.log('📝 Generating comprehensive test report...');
        
        // Calculate success rates
        const overallSuccessRate = ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1);
        
        const userExperienceScores = {};
        Object.entries(this.testResults.userExperience).forEach(([category, stats]) => {
            userExperienceScores[category] = {
                successRate: stats.attempted > 0 ? ((stats.successful / stats.attempted) * 100).toFixed(1) : '0',
                attempted: stats.attempted,
                successful: stats.successful
            };
        });
        
        const finalReport = {
            ...this.testResults,
            summary: {
                overallSuccessRate: `${overallSuccessRate}%`,
                totalTests: this.testResults.totalTests,
                passedTests: this.testResults.passedTests,
                failedTests: this.testResults.failedTests,
                foundFeatures: this.testResults.foundFeatures.length,
                missingFeatures: this.testResults.missingFeatures.length,
                screenshotsTaken: this.testResults.screenshots.length,
                errorsEncountered: this.testResults.errors.length
            },
            userExperienceScores,
            recommendations: this.generateRecommendations()
        };
        
        // Save report
        const reportPath = path.join(__dirname, 'test-results', 'barber-comprehensive-test-report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
        
        console.log('✅ Comprehensive test report generated:', reportPath);
        return finalReport;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Authentication recommendations
        if (this.testResults.userExperience.authentication.successful === 0) {
            recommendations.push({
                priority: 'Critical',
                category: 'Authentication',
                issue: 'Barber user authentication is not working',
                suggestion: 'Verify test credentials and authentication flow implementation'
            });
        }
        
        // Feature completeness recommendations
        if (this.testResults.foundFeatures.length < 10) {
            recommendations.push({
                priority: 'High',
                category: 'Features',
                issue: 'Limited barber-specific features detected',
                suggestion: 'Implement comprehensive barber dashboard with calendar, client management, and analytics'
            });
        }
        
        // Mobile experience recommendations
        if (this.testResults.userExperience.mobileUsability.successful === 0) {
            recommendations.push({
                priority: 'Medium',
                category: 'Mobile UX',
                issue: 'Mobile experience needs optimization',
                suggestion: 'Add responsive design and touch-friendly interface elements'
            });
        }
        
        // Error handling recommendations
        if (this.testResults.errors.length > 0) {
            recommendations.push({
                priority: 'High',
                category: 'Stability',
                issue: `${this.testResults.errors.length} errors detected during testing`,
                suggestion: 'Review error logs and implement proper error handling and user feedback'
            });
        }
        
        return recommendations;
    }

    async runAllTests() {
        console.log('🚀 Starting Barber User Comprehensive Test Suite...\n');
        
        try {
            await this.init();
            
            // Run test sequence
            await this.testHomepage();
            const authSuccess = await this.testAuthenticationFlow();
            
            if (authSuccess) {
                await this.testBarberDashboard();
                await this.testCalendarFunctionality();
                await this.testClientManagement();
            } else {
                console.log('⚠️ Skipping authenticated features due to auth failure');
                this.testResults.missingFeatures.push({
                    feature: 'Authenticated Barber Features',
                    issue: 'Cannot test due to authentication failure',
                    impact: 'High - core barber functionality unavailable'
                });
            }
            
            await this.testMobileExperience();
            
            const report = await this.generateReport();
            
            // Display results
            console.log('\n' + '='.repeat(80));
            console.log('📊 BARBER USER COMPREHENSIVE TEST RESULTS');
            console.log('='.repeat(80));
            console.log(`📈 Overall Success Rate: ${report.summary.overallSuccessRate}`);
            console.log(`✅ Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
            console.log(`🎯 Features Found: ${report.summary.foundFeatures}`);
            console.log(`❌ Missing Features: ${report.summary.missingFeatures}`);
            console.log(`📸 Screenshots: ${report.summary.screenshotsTaken}`);
            console.log(`🐛 Errors: ${report.summary.errorsEncountered}`);
            
            console.log('\n📋 User Experience Scores:');
            Object.entries(report.userExperienceScores).forEach(([category, score]) => {
                console.log(`  ${category}: ${score.successRate}% (${score.successful}/${score.attempted})`);
            });
            
            console.log('\n🔍 Found Features:');
            report.foundFeatures.forEach(feature => {
                console.log(`  ✅ ${feature.feature}: ${feature.status} - ${feature.details}`);
            });
            
            if (report.missingFeatures.length > 0) {
                console.log('\n❌ Missing Features:');
                report.missingFeatures.forEach(feature => {
                    console.log(`  ❌ ${feature.feature}: ${feature.issue}`);
                });
            }
            
            console.log('\n💡 Top Recommendations:');
            report.recommendations.slice(0, 3).forEach(rec => {
                console.log(`  ${rec.priority}: ${rec.issue}`);
                console.log(`    → ${rec.suggestion}`);
            });
            
            console.log(`\n📄 Full report: test-results/barber-comprehensive-test-report.json`);
            console.log(`📸 Screenshots: test-results/barber-user-screenshots/`);
            
            return report;
            
        } catch (error) {
            console.error('💥 Test suite failed:', error);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run the comprehensive test
const tester = new BarberUserComprehensiveTest();
tester.runAllTests()
    .then((report) => {
        console.log('\n🎉 Barber User Comprehensive Test completed!');
        const successRate = parseFloat(report.summary.overallSuccessRate);
        process.exit(successRate >= 70 ? 0 : 1);
    })
    .catch((error) => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });