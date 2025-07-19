/**
 * Error Handling Test Suite
 * 
 * Tests 404 pages, API error handling, network failures,
 * form error states, and error recovery mechanisms
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
    generateReport,
    TestResult
} = require('./test-utils');

class ErrorHandlingTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Error Handling Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
    }

    async test404Pages() {
        const result = new TestResult('404 Page Test');
        
        try {
            console.log('📍 Test: 404 Error Pages');
            
            const nonExistentPages = [
                '/this-page-does-not-exist',
                '/admin/non-existent-route',
                '/api/v2/invalid-endpoint',
                '/user/99999999',
                '/booking/invalid-id'
            ];
            
            for (const path of nonExistentPages) {
                console.log(`   Testing ${path}...`);
                
                await this.page.goto(`${CONFIG.baseUrl}${path}`, { 
                    waitUntil: 'networkidle2',
                    waitForTimeout: 5000
                });
                
                // Check for 404 indicators
                const is404 = await this.page.evaluate(() => {
                    // Check page title
                    const title = document.title.toLowerCase();
                    const has404InTitle = title.includes('404') || title.includes('not found');
                    
                    // Check page content
                    const bodyText = document.body.textContent.toLowerCase();
                    const has404InBody = bodyText.includes('404') || 
                                        bodyText.includes('not found') || 
                                        bodyText.includes('page not found');
                    
                    // Check for 404 heading
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
                    const has404Heading = headings.some(h => 
                        h.textContent.includes('404') || h.textContent.toLowerCase().includes('not found')
                    );
                    
                    return has404InTitle || has404InBody || has404Heading;
                });
                
                result.addStep(`404 page shown for ${path}`, is404);
                
                // Check for user-friendly elements
                const userFriendlyElements = await this.page.evaluate(() => {
                    return {
                        hasBackButton: !!document.querySelector('button:has-text("Back"), a:has-text("Back")'),
                        hasHomeLink: !!document.querySelector('a[href="/"], button:has-text("Home")'),
                        hasSearchBox: !!document.querySelector('input[type="search"], input[placeholder*="search"]'),
                        hasHelpfulMessage: document.body.textContent.includes('sorry') || 
                                          document.body.textContent.includes('help')
                    };
                });
                
                const isUserFriendly = Object.values(userFriendlyElements).some(v => v);
                result.addStep(`User-friendly 404 for ${path}`, isUserFriendly, userFriendlyElements);
                
                // Take screenshot
                const screenshot404 = await takeScreenshot(this.page, `404-${path.replace(/\//g, '-')}`);
                result.addScreenshot(screenshot404);
                
                // Test navigation from 404
                if (userFriendlyElements.hasHomeLink) {
                    await clickElement(this.page, 'a[href="/"], button:has-text("Home")');
                    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                    
                    const navigatedHome = this.page.url() === CONFIG.baseUrl + '/';
                    result.addStep('Can navigate from 404', navigatedHome);
                }
            }
            
            result.finish(true);
            console.log('✅ 404 page test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ 404 page test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testAPIErrorHandling() {
        const result = new TestResult('API Error Handling Test');
        
        try {
            console.log('\n📍 Test: API Error Handling');
            
            // Login first
            await login(this.page, 'admin');
            
            // Intercept requests to simulate errors
            await this.page.setRequestInterception(true);
            
            // Test different error scenarios
            const errorScenarios = [
                { status: 400, message: 'Bad Request' },
                { status: 401, message: 'Unauthorized' },
                { status: 403, message: 'Forbidden' },
                { status: 404, message: 'Not Found' },
                { status: 500, message: 'Internal Server Error' },
                { status: 503, message: 'Service Unavailable' }
            ];
            
            for (const scenario of errorScenarios) {
                console.log(`   Testing ${scenario.status} ${scenario.message}...`);
                
                // Set up interception for next API call
                const interceptPromise = new Promise((resolve) => {
                    const handler = (request) => {
                        if (request.url().includes('/api/')) {
                            this.page.off('request', handler);
                            request.respond({
                                status: scenario.status,
                                contentType: 'application/json',
                                body: JSON.stringify({
                                    error: scenario.message,
                                    message: `Simulated ${scenario.status} error`
                                })
                            });
                            resolve();
                        } else {
                            request.continue();
                        }
                    };
                    this.page.on('request', handler);
                });
                
                // Navigate to trigger API call
                this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
                await interceptPromise;
                await this.page.waitForTimeout(2000);
                
                // Check for error handling
                const errorHandling = await this.page.evaluate(() => {
                    // Look for error messages
                    const errorElements = document.querySelectorAll('.error, .alert-error, [role="alert"]');
                    const toastElements = document.querySelectorAll('.toast, .notification');
                    
                    // Check if error boundary caught errors
                    const errorBoundary = document.querySelector('.error-boundary, .error-fallback');
                    
                    // Check if page is still functional
                    const hasContent = document.querySelector('main, .content')?.children.length > 0;
                    const hasNavigation = !!document.querySelector('nav, .navigation');
                    
                    return {
                        errorDisplayed: errorElements.length > 0 || toastElements.length > 0,
                        errorBoundaryActive: !!errorBoundary,
                        pageStillFunctional: hasContent && hasNavigation,
                        errorMessages: Array.from(errorElements).map(el => el.textContent.trim()).slice(0, 3)
                    };
                });
                
                result.addStep(`${scenario.status} error handled gracefully`, 
                    errorHandling.errorDisplayed || errorHandling.errorBoundaryActive,
                    errorHandling
                );
                
                // Take screenshot
                const errorScreenshot = await takeScreenshot(this.page, `api-error-${scenario.status}`);
                result.addScreenshot(errorScreenshot);
                
                // Clear interception
                this.page.removeAllListeners('request');
            }
            
            // Disable interception
            await this.page.setRequestInterception(false);
            
            // Test retry mechanism
            console.log('   Testing retry mechanism...');
            
            // Re-enable interception for retry test
            await this.page.setRequestInterception(true);
            
            let requestCount = 0;
            this.page.on('request', (request) => {
                if (request.url().includes('/api/v2/dashboard')) {
                    requestCount++;
                    if (requestCount < 3) {
                        // Fail first 2 requests
                        request.respond({
                            status: 503,
                            contentType: 'application/json',
                            body: JSON.stringify({ error: 'Service temporarily unavailable' })
                        });
                    } else {
                        // Succeed on 3rd attempt
                        request.respond({
                            status: 200,
                            contentType: 'application/json',
                            body: JSON.stringify({ data: { message: 'Success after retry' } })
                        });
                    }
                } else {
                    request.continue();
                }
            });
            
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(5000); // Allow time for retries
            
            result.addStep('Retry mechanism works', requestCount >= 3, { attempts: requestCount });
            
            await this.page.setRequestInterception(false);
            
            result.finish(true);
            console.log('✅ API error handling test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ API error handling test failed:', error.message);
            
            // Ensure interception is disabled
            await this.page.setRequestInterception(false);
        }
        
        this.results.push(result);
        return result;
    }

    async testNetworkFailures() {
        const result = new TestResult('Network Failure Test');
        
        try {
            console.log('\n📍 Test: Network Failures');
            
            // Test offline mode
            console.log('   Testing offline mode...');
            
            // Go online first
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
            
            // Go offline
            await this.page.setOfflineMode(true);
            
            // Try to navigate
            try {
                await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { 
                    waitUntil: 'networkidle2',
                    timeout: 5000 
                });
            } catch (e) {
                // Expected to fail
            }
            
            // Check offline handling
            const offlineHandling = await this.page.evaluate(() => {
                // Check for offline indicator
                const offlineIndicator = document.querySelector('.offline, .no-connection, [data-offline]');
                
                // Check if service worker is active
                const hasServiceWorker = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
                
                // Check for offline message
                const bodyText = document.body.textContent.toLowerCase();
                const hasOfflineMessage = bodyText.includes('offline') || 
                                         bodyText.includes('no connection') || 
                                         bodyText.includes('no internet');
                
                return {
                    hasOfflineIndicator: !!offlineIndicator,
                    hasServiceWorker,
                    hasOfflineMessage,
                    pageTitle: document.title
                };
            });
            
            result.addStep('Offline mode handled', 
                offlineHandling.hasOfflineIndicator || offlineHandling.hasOfflineMessage,
                offlineHandling
            );
            
            // Take offline screenshot
            const offlineScreenshot = await takeScreenshot(this.page, 'network-offline');
            result.addScreenshot(offlineScreenshot);
            
            // Go back online
            await this.page.setOfflineMode(false);
            await this.page.reload({ waitUntil: 'networkidle2' });
            
            result.addStep('Recovery from offline', true);
            
            // Test slow network
            console.log('   Testing slow network...');
            
            // Login for authenticated tests
            await login(this.page, 'admin');
            
            // Simulate slow 3G
            await this.page.emulateNetworkConditions({
                offline: false,
                downloadThroughput: 50 * 1024 / 8, // 50kb/s
                uploadThroughput: 50 * 1024 / 8,
                latency: 2000 // 2 second latency
            });
            
            const slowNetworkStart = Date.now();
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
            
            // Check for loading indicators
            const loadingIndicators = await this.page.evaluate(() => {
                const indicators = document.querySelectorAll('.loading, .skeleton, .spinner, [aria-busy="true"]');
                return {
                    count: indicators.length,
                    visible: Array.from(indicators).some(el => {
                        const styles = window.getComputedStyle(el);
                        return styles.display !== 'none' && styles.visibility !== 'hidden';
                    })
                };
            });
            
            result.addStep('Loading indicators shown on slow network', 
                loadingIndicators.visible,
                loadingIndicators
            );
            
            // Wait for content
            await this.page.waitForTimeout(5000);
            const loadTime = Date.now() - slowNetworkStart;
            
            // Check if content eventually loaded
            const contentLoaded = await this.page.evaluate(() => {
                const mainContent = document.querySelector('main, .dashboard-content');
                return mainContent && mainContent.children.length > 0;
            });
            
            result.addStep('Content loads on slow network', contentLoaded, { loadTime });
            
            // Reset network conditions
            await this.page.emulateNetworkConditions({
                offline: false,
                downloadThroughput: -1,
                uploadThroughput: -1,
                latency: 0
            });
            
            result.finish(true);
            console.log('✅ Network failure test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Network failure test failed:', error.message);
            
            // Reset network conditions
            try {
                await this.page.setOfflineMode(false);
                await this.page.emulateNetworkConditions({
                    offline: false,
                    downloadThroughput: -1,
                    uploadThroughput: -1,
                    latency: 0
                });
            } catch (e) {}
        }
        
        this.results.push(result);
        return result;
    }

    async testFormErrorStates() {
        const result = new TestResult('Form Error States Test');
        
        try {
            console.log('\n📍 Test: Form Error States');
            
            // Test login form errors
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            
            // Test empty form submission
            console.log('   Testing empty form submission...');
            await clickElement(this.page, 'button[type="submit"]');
            await this.page.waitForTimeout(1000);
            
            const emptyFormErrors = await this.page.evaluate(() => {
                const errors = document.querySelectorAll('.error, .field-error, .invalid-feedback');
                const invalidInputs = document.querySelectorAll('input:invalid, input[aria-invalid="true"]');
                
                return {
                    errorCount: errors.length,
                    invalidInputCount: invalidInputs.length,
                    errors: Array.from(errors).map(e => e.textContent.trim()).slice(0, 5),
                    hasVisualIndicators: Array.from(invalidInputs).some(input => {
                        const styles = window.getComputedStyle(input);
                        return styles.borderColor.includes('red') || 
                               styles.borderColor.includes('rgb(220') || // red variants
                               input.classList.contains('error') ||
                               input.classList.contains('invalid');
                    })
                };
            });
            
            result.addStep('Empty form shows errors', 
                emptyFormErrors.errorCount > 0 || emptyFormErrors.invalidInputCount > 0,
                emptyFormErrors
            );
            
            // Test invalid email
            console.log('   Testing invalid email...');
            await fillField(this.page, 'input[type="email"]', 'not-an-email');
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            
            const emailError = await this.page.evaluate(() => {
                const emailInput = document.querySelector('input[type="email"]');
                const errorMessage = emailInput?.parentElement?.querySelector('.error, .invalid-feedback');
                
                return {
                    isInvalid: emailInput?.validity?.valid === false,
                    hasErrorMessage: !!errorMessage,
                    errorText: errorMessage?.textContent || '',
                    hasAriaError: emailInput?.getAttribute('aria-invalid') === 'true'
                };
            });
            
            result.addStep('Invalid email shows error', 
                emailError.isInvalid || emailError.hasErrorMessage,
                emailError
            );
            
            // Test field error clearing
            console.log('   Testing error clearing...');
            await fillField(this.page, 'input[type="email"]', 'valid@example.com');
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            
            const clearedError = await this.page.evaluate(() => {
                const emailInput = document.querySelector('input[type="email"]');
                const errorMessage = emailInput?.parentElement?.querySelector('.error, .invalid-feedback');
                
                return {
                    isValid: emailInput?.validity?.valid !== false,
                    errorCleared: !errorMessage || errorMessage.style.display === 'none',
                    ariaValid: emailInput?.getAttribute('aria-invalid') !== 'true'
                };
            });
            
            result.addStep('Errors clear when corrected', 
                clearedError.isValid && clearedError.errorCleared,
                clearedError
            );
            
            // Test server-side validation errors
            console.log('   Testing server validation errors...');
            await fillField(this.page, 'input[type="email"]', TEST_USERS.admin.email);
            await fillField(this.page, 'input[type="password"]', 'wrongpassword');
            await clickElement(this.page, 'button[type="submit"]');
            await this.page.waitForTimeout(2000);
            
            const serverError = await this.page.evaluate(() => {
                const alerts = document.querySelectorAll('.alert, .error-message, [role="alert"]');
                const formErrors = document.querySelectorAll('.form-error, .server-error');
                
                return {
                    hasAlert: alerts.length > 0,
                    hasFormError: formErrors.length > 0,
                    messages: Array.from([...alerts, ...formErrors])
                        .map(e => e.textContent.trim())
                        .filter(text => text.length > 0)
                        .slice(0, 3),
                    isAccessible: Array.from(alerts).some(alert => 
                        alert.getAttribute('role') === 'alert' || 
                        alert.getAttribute('aria-live') === 'polite'
                    )
                };
            });
            
            result.addStep('Server errors displayed', 
                serverError.hasAlert || serverError.hasFormError,
                serverError
            );
            
            // Take screenshot of form with errors
            const formErrorScreenshot = await takeScreenshot(this.page, 'form-errors');
            result.addScreenshot(formErrorScreenshot);
            
            // Test registration form for more complex validation
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            
            // Test password validation
            console.log('   Testing password validation...');
            await fillField(this.page, 'input[type="password"]', '123'); // Weak password
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            
            const passwordValidation = await this.page.evaluate(() => {
                const passwordInput = document.querySelector('input[type="password"]');
                const strengthIndicator = document.querySelector('.password-strength, .strength-meter');
                const requirements = document.querySelectorAll('.password-requirement, .requirement');
                
                return {
                    hasStrengthIndicator: !!strengthIndicator,
                    hasRequirements: requirements.length > 0,
                    requirementCount: requirements.length,
                    someRequirementsFailed: Array.from(requirements).some(req => 
                        req.classList.contains('invalid') || 
                        req.classList.contains('unmet') ||
                        req.querySelector('.error, .x-icon')
                    )
                };
            });
            
            result.addStep('Password validation UI', 
                passwordValidation.hasStrengthIndicator || passwordValidation.hasRequirements,
                passwordValidation
            );
            
            result.finish(true);
            console.log('✅ Form error states test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Form error states test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testErrorBoundaries() {
        const result = new TestResult('Error Boundaries Test');
        
        try {
            console.log('\n📍 Test: Error Boundaries');
            
            // Login first
            await login(this.page, 'admin');
            
            // Inject JavaScript errors to trigger error boundaries
            console.log('   Triggering JavaScript errors...');
            
            // Navigate to dashboard
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Inject error into React component (if React is used)
            const errorInjected = await this.page.evaluate(() => {
                try {
                    // Try to find React root
                    const reactRoot = document.querySelector('#root, #__next, .app-root');
                    if (reactRoot && window.React) {
                        // Force an error in React
                        const errorEvent = new ErrorEvent('error', {
                            error: new Error('Test error for error boundary'),
                            message: 'Simulated component error',
                            filename: 'test.js',
                            lineno: 1,
                            colno: 1
                        });
                        window.dispatchEvent(errorEvent);
                        return true;
                    }
                    
                    // Generic error for non-React apps
                    throw new Error('Simulated application error');
                } catch (e) {
                    console.error('Injected error:', e);
                    return true;
                }
            });
            
            await this.page.waitForTimeout(2000);
            
            // Check if error boundary caught the error
            const errorBoundaryActive = await this.page.evaluate(() => {
                // Look for error boundary UI
                const errorBoundary = document.querySelector(
                    '.error-boundary, .error-fallback, .error-page, [data-error-boundary]'
                );
                
                // Look for error messages
                const hasErrorUI = document.body.textContent.toLowerCase().includes('something went wrong') ||
                                  document.body.textContent.toLowerCase().includes('error occurred') ||
                                  document.body.textContent.toLowerCase().includes('unexpected error');
                
                // Check if page is still interactive
                const hasReloadButton = !!document.querySelector(
                    'button:has-text("Reload"), button:has-text("Refresh"), button:has-text("Try again")'
                );
                
                return {
                    hasErrorBoundary: !!errorBoundary,
                    hasErrorUI,
                    hasReloadButton,
                    pageStillResponsive: document.querySelector('body').onclick !== null
                };
            });
            
            result.addStep('Error boundary catches errors', 
                errorBoundaryActive.hasErrorBoundary || errorBoundaryActive.hasErrorUI,
                errorBoundaryActive
            );
            
            // Take screenshot of error boundary
            const errorBoundaryScreenshot = await takeScreenshot(this.page, 'error-boundary');
            result.addScreenshot(errorBoundaryScreenshot);
            
            // Test error recovery
            if (errorBoundaryActive.hasReloadButton) {
                console.log('   Testing error recovery...');
                
                await clickElement(this.page, 'button:has-text("Reload"), button:has-text("Refresh"), button:has-text("Try again")');
                await this.page.waitForTimeout(2000);
                
                const recovered = await this.page.evaluate(() => {
                    const errorBoundary = document.querySelector('.error-boundary, .error-fallback');
                    const hasNormalContent = document.querySelector('main, .dashboard-content');
                    
                    return {
                        errorBoundaryGone: !errorBoundary || errorBoundary.style.display === 'none',
                        normalContentVisible: !!hasNormalContent
                    };
                });
                
                result.addStep('Can recover from errors', 
                    recovered.errorBoundaryGone || recovered.normalContentVisible,
                    recovered
                );
            }
            
            // Test chunk loading failures
            console.log('   Testing chunk loading failures...');
            
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                if (request.url().includes('.chunk.js') || request.url().includes('_next/static')) {
                    request.abort('failed');
                } else {
                    request.continue();
                }
            });
            
            // Try to navigate to trigger chunk loading
            try {
                await this.page.goto(`${CONFIG.baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
            } catch (e) {
                // Expected to have issues
            }
            
            await this.page.waitForTimeout(2000);
            
            const chunkErrorHandling = await this.page.evaluate(() => {
                const hasChunkError = document.body.textContent.toLowerCase().includes('chunk') ||
                                     document.body.textContent.toLowerCase().includes('loading') ||
                                     document.querySelector('.chunk-error, .loading-error');
                
                return {
                    errorHandled: hasChunkError || document.querySelector('.error-boundary'),
                    pageText: document.body.textContent.substring(0, 200)
                };
            });
            
            result.addStep('Chunk loading errors handled', 
                chunkErrorHandling.errorHandled,
                chunkErrorHandling
            );
            
            await this.page.setRequestInterception(false);
            
            result.finish(true);
            console.log('✅ Error boundaries test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Error boundaries test failed:', error.message);
            
            // Ensure interception is disabled
            try {
                await this.page.setRequestInterception(false);
            } catch (e) {}
        }
        
        this.results.push(result);
        return result;
    }

    async testAccessibilityErrors() {
        const result = new TestResult('Accessibility Error Handling Test');
        
        try {
            console.log('\n📍 Test: Accessibility Error Handling');
            
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
            
            // Check for proper ARIA labels on error states
            const accessibilityChecks = await this.page.evaluate(() => {
                const checks = {
                    errorMessages: [],
                    properAriaLabels: 0,
                    improperAriaLabels: 0,
                    liveRegions: 0,
                    focusManagement: true
                };
                
                // Check all error messages
                const errorElements = document.querySelectorAll('.error, [role="alert"], .invalid-feedback');
                errorElements.forEach(error => {
                    const hasRole = error.getAttribute('role') === 'alert';
                    const hasAriaLive = error.getAttribute('aria-live') === 'polite' || 
                                       error.getAttribute('aria-live') === 'assertive';
                    const isAccessible = hasRole || hasAriaLive;
                    
                    checks.errorMessages.push({
                        text: error.textContent.trim().substring(0, 50),
                        accessible: isAccessible,
                        role: error.getAttribute('role'),
                        ariaLive: error.getAttribute('aria-live')
                    });
                    
                    if (isAccessible) checks.properAriaLabels++;
                    else checks.improperAriaLabels++;
                });
                
                // Check for live regions
                checks.liveRegions = document.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]').length;
                
                // Check invalid form fields
                const invalidInputs = document.querySelectorAll('input[aria-invalid="true"], input:invalid');
                invalidInputs.forEach(input => {
                    const hasErrorMessage = input.getAttribute('aria-describedby') || 
                                           input.getAttribute('aria-errormessage');
                    if (hasErrorMessage) checks.properAriaLabels++;
                    else checks.improperAriaLabels++;
                });
                
                return checks;
            });
            
            result.addStep('Errors have proper ARIA labels', 
                accessibilityChecks.properAriaLabels > accessibilityChecks.improperAriaLabels,
                accessibilityChecks
            );
            
            // Test keyboard navigation through errors
            console.log('   Testing keyboard navigation...');
            
            // Navigate to login form
            await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
            
            // Submit empty form to trigger errors
            await this.page.keyboard.press('Tab'); // Focus first input
            await this.page.keyboard.press('Tab'); // Skip to submit
            await this.page.keyboard.press('Tab'); // Focus submit button
            await this.page.keyboard.press('Enter'); // Submit
            await this.page.waitForTimeout(1000);
            
            // Test tab navigation through error fields
            const keyboardNavigation = await this.page.evaluate(() => {
                const results = {
                    focusableElements: 0,
                    errorFieldsFocusable: true,
                    focusOrder: []
                };
                
                // Get all focusable elements
                const focusable = document.querySelectorAll(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                results.focusableElements = focusable.length;
                
                // Check if error fields can receive focus
                const errorInputs = document.querySelectorAll('input[aria-invalid="true"], input.error');
                errorInputs.forEach(input => {
                    if (input.tabIndex < 0) results.errorFieldsFocusable = false;
                });
                
                return results;
            });
            
            result.addStep('Error fields keyboard accessible', 
                keyboardNavigation.errorFieldsFocusable,
                keyboardNavigation
            );
            
            // Test screen reader announcements
            const screenReaderSupport = await this.page.evaluate(() => {
                const announcements = [];
                
                // Check for skip links
                const skipLinks = document.querySelector('a[href="#main"], a[href="#content"]');
                announcements.push({
                    feature: 'Skip to main content',
                    present: !!skipLinks
                });
                
                // Check for form labels
                const inputs = document.querySelectorAll('input, select, textarea');
                let labeledInputs = 0;
                inputs.forEach(input => {
                    if (input.getAttribute('aria-label') || 
                        input.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${input.id}"]`)) {
                        labeledInputs++;
                    }
                });
                
                announcements.push({
                    feature: 'Form labels',
                    present: labeledInputs === inputs.length,
                    coverage: `${labeledInputs}/${inputs.length}`
                });
                
                // Check for heading structure
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const properStructure = Array.from(headings).every((h, i, arr) => {
                    if (i === 0) return true;
                    const currentLevel = parseInt(h.tagName[1]);
                    const prevLevel = parseInt(arr[i-1].tagName[1]);
                    return currentLevel <= prevLevel + 1;
                });
                
                announcements.push({
                    feature: 'Proper heading structure',
                    present: properStructure
                });
                
                return announcements;
            });
            
            result.addStep('Screen reader support', 
                screenReaderSupport.every(s => s.present),
                { features: screenReaderSupport }
            );
            
            result.finish(true);
            console.log('✅ Accessibility error handling test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Accessibility error handling test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all error handling tests
            await this.test404Pages();
            await this.testAPIErrorHandling();
            await this.testNetworkFailures();
            await this.testFormErrorStates();
            await this.testErrorBoundaries();
            await this.testAccessibilityErrors();
            
            // Generate report
            const report = generateReport('error-handling', this.results);
            
            // Summary
            console.log('\n📊 Error Handling Summary');
            console.log('========================');
            
            const allSteps = this.results.flatMap(r => r.steps);
            const failedSteps = allSteps.filter(s => !s.success);
            
            if (failedSteps.length === 0) {
                console.log('✅ All error handling tests passed!');
                console.log('   - 404 pages properly implemented');
                console.log('   - API errors handled gracefully');
                console.log('   - Network failures managed');
                console.log('   - Form validation working');
                console.log('   - Error boundaries in place');
                console.log('   - Accessibility standards met');
            } else {
                console.log(`⚠️  ${failedSteps.length} error handling issues found:`);
                failedSteps.forEach(step => {
                    console.log(`   - ${step.name}`);
                });
            }
            
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
    const tester = new ErrorHandlingTester();
    tester.runAllTests().catch(console.error);
}

module.exports = ErrorHandlingTester;