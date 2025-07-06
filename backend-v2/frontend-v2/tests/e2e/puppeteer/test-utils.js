/**
 * Puppeteer Test Utilities for BookedBarber V2
 * 
 * Shared utilities, selectors, and helper functions for all Puppeteer tests
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    apiUrl: process.env.TEST_API_URL || 'http://localhost:8000',
    headless: process.env.TEST_HEADLESS === 'true',
    slowMo: parseInt(process.env.TEST_SLOW_MO || '0'),
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    screenshotDir: './test-screenshots',
    reportDir: './test-reports'
};

// Test credentials
const TEST_USERS = {
    admin: {
        email: 'admin.test@bookedbarber.com',
        password: 'AdminTest123'
    },
    barber: {
        email: 'barber.test@bookedbarber.com',
        password: 'TestPassword123!'
    },
    client: {
        email: 'client.test@bookedbarber.com',
        password: 'TestPassword123!'
    }
};

// Common selectors
const SELECTORS = {
    // Auth forms
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[type="password"], input[name="password"], #password',
    submitButton: 'button[type="submit"]',
    loginButton: 'button:has-text("Sign in"), button:has-text("Login")',
    
    // Navigation
    dashboardLink: 'a[href="/dashboard"]',
    calendarLink: 'a[href="/calendar"]',
    bookingsLink: 'a[href="/bookings"]',
    settingsLink: 'a[href="/settings"]',
    logoutButton: 'button:has-text("Logout"), button:has-text("Sign out")',
    
    // Booking flow
    bookButton: 'a[href="/book"], button:has-text("Book")',
    serviceCard: '.service-card, .service-option',
    timeSlot: '.time-slot, .available-time',
    confirmButton: 'button:has-text("Confirm"), .confirm-booking',
    
    // Common UI elements
    errorMessage: '.error, .text-red-600, [role="alert"]',
    successMessage: '.success, .text-green-600',
    loadingSpinner: '.loading, .spinner, [role="progressbar"]',
    modal: '[role="dialog"], .modal',
    toast: '.toast, [role="status"]'
};

// Ensure directories exist
function ensureDirectories() {
    const dirs = [CONFIG.screenshotDir, CONFIG.reportDir];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Generate unique test user
function generateTestUser() {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    return {
        name: `Test User ${timestamp}`,
        email: `test.user.${timestamp}@bookedbarber.com`,
        password: 'TestPassword123!',
        businessName: `Test Barbershop ${timestamp}`,
        phone: '+12125551234'
    };
}

// Wait for selector with custom error message
async function waitForSelector(page, selector, options = {}) {
    try {
        return await page.waitForSelector(selector, {
            timeout: CONFIG.timeout,
            ...options
        });
    } catch (error) {
        throw new Error(`Failed to find element: ${selector}\nOriginal error: ${error.message}`);
    }
}

// Click element with retry logic
async function clickElement(page, selector, options = {}) {
    const maxRetries = options.retries || 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await waitForSelector(page, selector);
            await page.click(selector);
            return;
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await page.waitForTimeout(1000);
            }
        }
    }
    
    throw new Error(`Failed to click element after ${maxRetries} attempts: ${selector}\n${lastError.message}`);
}

// Fill form field with clear first
async function fillField(page, selector, value) {
    await waitForSelector(page, selector);
    await page.click(selector, { clickCount: 3 }); // Select all
    await page.keyboard.press('Backspace'); // Clear
    await page.type(selector, value, { delay: 50 });
}

// Take screenshot with metadata
async function takeScreenshot(page, name, metadata = {}) {
    ensureDirectories();
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    
    await page.screenshot({
        path: filepath,
        fullPage: true
    });
    
    // Save metadata
    const metadataPath = filepath.replace('.png', '.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
        name,
        timestamp,
        url: page.url(),
        viewport: page.viewport(),
        ...metadata
    }, null, 2));
    
    return filename;
}

// Check for console errors
async function checkForConsoleErrors(page) {
    const errors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push({
                text: msg.text(),
                location: msg.location(),
                timestamp: new Date().toISOString()
            });
        }
    });
    
    page.on('pageerror', error => {
        errors.push({
            text: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    });
    
    return errors;
}

// Monitor network requests
function setupNetworkMonitoring(page) {
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData(),
            timestamp: new Date().toISOString()
        });
    });
    
    page.on('response', response => {
        responses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            timestamp: new Date().toISOString()
        });
    });
    
    page.on('requestfailed', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure(),
            timestamp: new Date().toISOString(),
            failed: true
        });
    });
    
    return { requests, responses };
}

// Login helper
async function login(page, userType = 'admin') {
    const user = TEST_USERS[userType];
    if (!user) {
        throw new Error(`Unknown user type: ${userType}`);
    }
    
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
    await fillField(page, SELECTORS.emailInput, user.email);
    await fillField(page, SELECTORS.passwordInput, user.password);
    await clickElement(page, SELECTORS.submitButton);
    
    // Wait for navigation or error
    await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        waitForSelector(page, SELECTORS.errorMessage, { timeout: 5000 })
    ]).catch(() => {});
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/')) {
        return true;
    }
    
    // Check for error message
    const error = await page.$(SELECTORS.errorMessage);
    if (error) {
        const errorText = await error.evaluate(el => el.textContent);
        throw new Error(`Login failed: ${errorText}`);
    }
    
    return false;
}

// Logout helper
async function logout(page) {
    try {
        await clickElement(page, SELECTORS.logoutButton);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        return true;
    } catch (error) {
        console.warn('Logout failed:', error.message);
        return false;
    }
}

// Wait for page load
async function waitForPageLoad(page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Additional wait for React hydration
}

// Measure page performance
async function measurePerformance(page) {
    const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            resources: performance.getEntriesByType('resource').length
        };
    });
    
    return metrics;
}

// Generate test report
function generateReport(testName, results) {
    ensureDirectories();
    const reportPath = path.join(CONFIG.reportDir, `${testName}-${Date.now()}.json`);
    
    const report = {
        testName,
        timestamp: new Date().toISOString(),
        environment: {
            baseUrl: CONFIG.baseUrl,
            apiUrl: CONFIG.apiUrl,
            headless: CONFIG.headless
        },
        results,
        summary: {
            total: results.length,
            passed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
        }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 Test Report Summary');
    console.log('======================');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} ✅`);
    console.log(`Failed: ${report.summary.failed} ❌`);
    console.log(`Total Duration: ${Math.round(report.summary.duration)}ms`);
    console.log(`Report saved to: ${reportPath}`);
    
    return report;
}

// Test result helper
class TestResult {
    constructor(name) {
        this.name = name;
        this.steps = [];
        this.success = false;
        this.errors = [];
        this.screenshots = [];
        this.performance = {};
        this.startTime = Date.now();
    }
    
    addStep(name, success, details = {}) {
        this.steps.push({
            name,
            success,
            timestamp: new Date().toISOString(),
            ...details
        });
    }
    
    addError(error) {
        this.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    addScreenshot(filename) {
        this.screenshots.push(filename);
    }
    
    setPerformance(metrics) {
        this.performance = metrics;
    }
    
    finish(success = null) {
        this.duration = Date.now() - this.startTime;
        this.success = success !== null ? success : this.errors.length === 0;
        return this;
    }
}

module.exports = {
    CONFIG,
    TEST_USERS,
    SELECTORS,
    ensureDirectories,
    generateTestUser,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    logout,
    waitForPageLoad,
    measurePerformance,
    generateReport,
    TestResult
};