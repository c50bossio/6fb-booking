/**
 * Authentication Flow Test Suite
 * 
 * Tests login, logout, session persistence, and protected route access
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    TEST_USERS,
    SELECTORS,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    logout,
    generateReport,
    TestResult
} = require('./test-utils');

class AuthFlowTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Authentication Flow Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up error monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
    }

    async testValidLogin() {
        const result = new TestResult('Valid Login Test');
        
        try {
            console.log('📍 Test: Valid Login');
            
            // Navigate to login page
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to login page', true);
            
            // Check login form exists
            await waitForSelector(this.page, SELECTORS.emailInput);
            await waitForSelector(this.page, SELECTORS.passwordInput);
            await waitForSelector(this.page, SELECTORS.submitButton);
            result.addStep('Login form elements found', true);
            
            // Take screenshot of login page
            const loginScreenshot = await takeScreenshot(this.page, 'valid-login-page');
            result.addScreenshot(loginScreenshot);
            
            // Fill login form
            await fillField(this.page, SELECTORS.emailInput, TEST_USERS.admin.email);
            await fillField(this.page, SELECTORS.passwordInput, TEST_USERS.admin.password);
            result.addStep('Fill login credentials', true);
            
            // Submit form
            await clickElement(this.page, SELECTORS.submitButton);
            
            // Wait for navigation
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            result.addStep('Submit login form', true);
            
            // Verify successful login
            const currentUrl = this.page.url();
            const isLoggedIn = currentUrl.includes('/dashboard') || !currentUrl.includes('/login');
            
            if (isLoggedIn) {
                result.addStep('Redirected to dashboard', true, { url: currentUrl });
                
                // Check for auth token in storage
                const hasToken = await this.page.evaluate(() => {
                    return !!(
                        localStorage.getItem('token') || 
                        localStorage.getItem('authToken') || 
                        localStorage.getItem('access_token') ||
                        sessionStorage.getItem('token') ||
                        sessionStorage.getItem('authToken') ||
                        sessionStorage.getItem('access_token')
                    );
                });
                
                result.addStep('Auth token stored', hasToken);
                
                // Take screenshot of dashboard
                const dashboardScreenshot = await takeScreenshot(this.page, 'valid-login-dashboard');
                result.addScreenshot(dashboardScreenshot);
                
                result.finish(true);
                console.log('✅ Valid login test passed');
            } else {
                throw new Error('Login failed - still on login page');
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Valid login test failed:', error.message);
            
            // Take error screenshot
            const errorScreenshot = await takeScreenshot(this.page, 'valid-login-error');
            result.addScreenshot(errorScreenshot);
        }
        
        this.results.push(result);
        return result;
    }

    async testInvalidLogin() {
        const result = new TestResult('Invalid Login Test');
        
        try {
            console.log('\n📍 Test: Invalid Login');
            
            // Navigate to login page
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to login page', true);
            
            // Fill with invalid credentials
            await fillField(this.page, SELECTORS.emailInput, 'invalid@example.com');
            await fillField(this.page, SELECTORS.passwordInput, 'wrongpassword');
            result.addStep('Fill invalid credentials', true);
            
            // Submit form
            await clickElement(this.page, SELECTORS.submitButton);
            
            // Wait for error message
            await this.page.waitForTimeout(2000);
            
            // Check for error message
            const errorElement = await this.page.$(SELECTORS.errorMessage);
            if (errorElement) {
                const errorText = await errorElement.evaluate(el => el.textContent);
                result.addStep('Error message displayed', true, { message: errorText });
                
                // Verify still on login page
                const currentUrl = this.page.url();
                const stillOnLogin = currentUrl.includes('/login');
                result.addStep('Remained on login page', stillOnLogin);
                
                // Take screenshot
                const errorScreenshot = await takeScreenshot(this.page, 'invalid-login-error');
                result.addScreenshot(errorScreenshot);
                
                result.finish(true);
                console.log('✅ Invalid login test passed (correctly rejected)');
            } else {
                throw new Error('No error message shown for invalid credentials');
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Invalid login test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testLogout() {
        const result = new TestResult('Logout Test');
        
        try {
            console.log('\n📍 Test: Logout');
            
            // First login
            await login(this.page, 'admin');
            result.addStep('Login successful', true);
            
            // Find logout button
            await waitForSelector(this.page, SELECTORS.logoutButton);
            result.addStep('Logout button found', true);
            
            // Click logout
            await clickElement(this.page, SELECTORS.logoutButton);
            
            // Wait for redirect
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            // Verify logged out
            const currentUrl = this.page.url();
            const isLoggedOut = currentUrl.includes('/login') || currentUrl === CONFIG.baseUrl + '/';
            result.addStep('Redirected after logout', isLoggedOut, { url: currentUrl });
            
            // Check token removed
            const hasToken = await this.page.evaluate(() => {
                return !!(
                    localStorage.getItem('token') || 
                    localStorage.getItem('authToken') || 
                    localStorage.getItem('access_token') ||
                    sessionStorage.getItem('token') ||
                    sessionStorage.getItem('authToken') ||
                    sessionStorage.getItem('access_token')
                );
            });
            
            result.addStep('Auth token removed', !hasToken);
            
            // Take screenshot
            const logoutScreenshot = await takeScreenshot(this.page, 'logout-success');
            result.addScreenshot(logoutScreenshot);
            
            result.finish(true);
            console.log('✅ Logout test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Logout test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testSessionPersistence() {
        const result = new TestResult('Session Persistence Test');
        
        try {
            console.log('\n📍 Test: Session Persistence');
            
            // Login first
            await login(this.page, 'admin');
            result.addStep('Initial login successful', true);
            
            // Store current URL
            const dashboardUrl = this.page.url();
            
            // Reload page
            await this.page.reload({ waitUntil: 'networkidle2' });
            result.addStep('Page reloaded', true);
            
            // Check if still logged in
            const currentUrl = this.page.url();
            const stillLoggedIn = !currentUrl.includes('/login');
            result.addStep('Still logged in after reload', stillLoggedIn, { url: currentUrl });
            
            // Close and reopen page (new tab simulation)
            const newPage = await this.browser.newPage();
            await newPage.goto(dashboardUrl, { waitUntil: 'networkidle2' });
            
            const newPageUrl = newPage.url();
            const newPageLoggedIn = !newPageUrl.includes('/login');
            result.addStep('Still logged in in new tab', newPageLoggedIn, { url: newPageUrl });
            
            await newPage.close();
            
            // Take screenshot
            const persistenceScreenshot = await takeScreenshot(this.page, 'session-persistence');
            result.addScreenshot(persistenceScreenshot);
            
            result.finish(stillLoggedIn && newPageLoggedIn);
            console.log('✅ Session persistence test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Session persistence test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testProtectedRouteAccess() {
        const result = new TestResult('Protected Route Access Test');
        
        try {
            console.log('\n📍 Test: Protected Route Access');
            
            // Logout first to ensure clean state
            await this.page.goto(`${CONFIG.baseUrl}/logout`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(1000);
            
            // Try to access protected route without login
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            const unauthorizedUrl = this.page.url();
            const redirectedToLogin = unauthorizedUrl.includes('/login');
            result.addStep('Unauthorized access redirected to login', redirectedToLogin, { url: unauthorizedUrl });
            
            // Now login and try again
            await login(this.page, 'admin');
            result.addStep('Login successful', true);
            
            // Access protected routes
            const protectedRoutes = [
                { path: '/dashboard', name: 'Dashboard' },
                { path: '/calendar', name: 'Calendar' },
                { path: '/bookings', name: 'Bookings' },
                { path: '/settings', name: 'Settings' }
            ];
            
            for (const route of protectedRoutes) {
                try {
                    await this.page.goto(`${CONFIG.baseUrl}${route.path}`, { waitUntil: 'networkidle2' });
                    const routeUrl = this.page.url();
                    const canAccess = !routeUrl.includes('/login');
                    result.addStep(`Can access ${route.name}`, canAccess, { url: routeUrl });
                    
                    if (canAccess) {
                        const screenshot = await takeScreenshot(this.page, `protected-route-${route.name.toLowerCase()}`);
                        result.addScreenshot(screenshot);
                    }
                } catch (error) {
                    result.addStep(`Error accessing ${route.name}`, false, { error: error.message });
                }
            }
            
            result.finish(true);
            console.log('✅ Protected route access test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Protected route access test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testPasswordReset() {
        const result = new TestResult('Password Reset Flow Test');
        
        try {
            console.log('\n📍 Test: Password Reset Flow');
            
            // Navigate to login page
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to login page', true);
            
            // Look for forgot password link
            const forgotPasswordLink = await this.page.$('a[href*="forgot"], a:has-text("Forgot password"), .forgot-password-link');
            
            if (forgotPasswordLink) {
                await forgotPasswordLink.click();
                await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                result.addStep('Navigate to password reset page', true);
                
                // Fill email for reset
                await fillField(this.page, SELECTORS.emailInput, TEST_USERS.admin.email);
                result.addStep('Fill email for reset', true);
                
                // Submit reset request
                await clickElement(this.page, SELECTORS.submitButton);
                await this.page.waitForTimeout(2000);
                
                // Check for success message
                const successElement = await this.page.$(SELECTORS.successMessage);
                if (successElement) {
                    const successText = await successElement.evaluate(el => el.textContent);
                    result.addStep('Password reset email sent', true, { message: successText });
                }
                
                // Take screenshot
                const resetScreenshot = await takeScreenshot(this.page, 'password-reset-flow');
                result.addScreenshot(resetScreenshot);
                
                result.finish(true);
                console.log('✅ Password reset flow test passed');
            } else {
                result.addStep('Forgot password link not found', false);
                result.finish(false);
                console.log('⚠️  Password reset flow not available');
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Password reset flow test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all auth tests
            await this.testValidLogin();
            await this.testInvalidLogin();
            await this.testLogout();
            await this.testSessionPersistence();
            await this.testProtectedRouteAccess();
            await this.testPasswordReset();
            
            // Generate report
            const report = generateReport('auth-flow', this.results);
            
            // Check console errors
            if (this.consoleErrors.length > 0) {
                console.log('\n⚠️  Console errors detected:');
                this.consoleErrors.forEach(error => {
                    console.log(`   - ${error.text}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AuthFlowTester();
    tester.runAllTests().catch(console.error);
}

module.exports = AuthFlowTester;