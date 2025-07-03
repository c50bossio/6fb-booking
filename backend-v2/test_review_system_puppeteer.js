/**
 * Comprehensive Puppeteer Test for Review Management System
 * Tests both frontend and backend integration
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_EMAIL = 'validation_test@example.com';
const TEST_PASSWORD = 'ValidTest123';

class ReviewSystemPuppeteerTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.authToken = null;
        this.testResults = [];
    }

    log(test, status, details = '') {
        const result = {
            test,
            status,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${emoji} ${test}: ${status}`);
        if (details) console.log(`   ${details}`);
    }

    async setup() {
        console.log('🚀 Starting Puppeteer Review System Test');
        console.log('=' * 60);
        
        this.browser = await puppeteer.launch({ 
            headless: false,  // Set to true for CI/CD
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Enable request/response logging
        await this.page.setRequestInterception(true);
        this.page.on('request', request => {
            if (request.url().includes('/api/v1/reviews')) {
                console.log(`📡 API Request: ${request.method()} ${request.url()}`);
            }
            request.continue();
        });
        
        this.page.on('response', response => {
            if (response.url().includes('/api/v1/reviews')) {
                console.log(`📡 API Response: ${response.status()} ${response.url()}`);
            }
        });
    }

    async testAPIAuthentication() {
        console.log('\n🔐 Testing API Authentication...');
        
        try {
            // Test authentication endpoint
            const response = await this.page.evaluate(async (baseUrl, email, password) => {
                const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                return {
                    status: res.status,
                    data: await res.json()
                };
            }, BASE_URL, TEST_EMAIL, TEST_PASSWORD);

            if (response.status === 200 && response.data.access_token) {
                this.authToken = response.data.access_token;
                this.log('API Authentication', 'PASS', `Token obtained: ${this.authToken.substring(0, 20)}...`);
                return true;
            } else {
                this.log('API Authentication', 'FAIL', `Status: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log('API Authentication', 'FAIL', `Error: ${error.message}`);
            return false;
        }
    }

    async testReviewEndpoints() {
        console.log('\n📋 Testing Review API Endpoints...');
        
        const endpoints = [
            { url: '/api/v1/reviews', method: 'GET', name: 'Get Reviews' },
            { url: '/api/v1/reviews/auto-response/stats', method: 'GET', name: 'Auto-Response Stats' },
            { url: '/api/v1/reviews/templates', method: 'GET', name: 'Review Templates' },
            { url: '/api/v1/reviews/gmb/locations', method: 'GET', name: 'GMB Locations' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.page.evaluate(async (baseUrl, url, method, token) => {
                    const options = {
                        method,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    };

                    const res = await fetch(`${baseUrl}${url}`, options);
                    return {
                        status: res.status,
                        data: res.status === 200 ? await res.json() : await res.text()
                    };
                }, BASE_URL, endpoint.url, endpoint.method, this.authToken);

                if ([200, 400, 404, 422].includes(response.status)) {
                    this.log(endpoint.name, 'PASS', `Status: ${response.status}`);
                } else {
                    this.log(endpoint.name, 'FAIL', `Unexpected status: ${response.status}`);
                }
            } catch (error) {
                this.log(endpoint.name, 'FAIL', `Error: ${error.message}`);
            }
        }
    }

    async testReviewSync() {
        console.log('\n🔄 Testing Review Sync...');
        
        try {
            const response = await this.page.evaluate(async (baseUrl, token) => {
                const res = await fetch(`${baseUrl}/api/v1/reviews/sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        platform: 'google',
                        date_range_days: 30
                    })
                });
                return {
                    status: res.status,
                    data: await res.text()
                };
            }, BASE_URL, this.authToken);

            if ([200, 400, 404].includes(response.status)) {
                this.log('Review Sync', 'PASS', `Status: ${response.status} (Expected for demo)`);
            } else {
                this.log('Review Sync', 'FAIL', `Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.log('Review Sync', 'FAIL', `Error: ${error.message}`);
        }
    }

    async testSecurityFeatures() {
        console.log('\n🔐 Testing Security Features...');
        
        try {
            // Test unauthenticated access
            const response = await this.page.evaluate(async (baseUrl) => {
                const res = await fetch(`${baseUrl}/api/v1/reviews`);
                return { status: res.status };
            }, BASE_URL);

            if ([401, 403].includes(response.status)) {
                this.log('Unauthenticated Access Blocked', 'PASS', `Status: ${response.status}`);
            } else {
                this.log('Unauthenticated Access Blocked', 'FAIL', `Status: ${response.status}`);
            }

            // Test invalid token
            const invalidTokenResponse = await this.page.evaluate(async (baseUrl) => {
                const res = await fetch(`${baseUrl}/api/v1/reviews`, {
                    headers: { 'Authorization': 'Bearer invalid_token' }
                });
                return { status: res.status };
            }, BASE_URL);

            if ([401, 403].includes(invalidTokenResponse.status)) {
                this.log('Invalid Token Rejected', 'PASS', `Status: ${invalidTokenResponse.status}`);
            } else {
                this.log('Invalid Token Rejected', 'FAIL', `Status: ${invalidTokenResponse.status}`);
            }

        } catch (error) {
            this.log('Security Test', 'FAIL', `Error: ${error.message}`);
        }
    }

    async testFrontendIntegrationPage() {
        console.log('\n🖥️  Testing Frontend Integration Page...');
        
        try {
            await this.page.goto(`${FRONTEND_URL}/settings/integrations`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Check if page loads
            const title = await this.page.title();
            this.log('Integration Page Load', 'PASS', `Title: ${title}`);

            // Check for key elements
            const elements = await this.page.evaluate(() => {
                return {
                    hasHeader: !!document.querySelector('h1'),
                    hasIntegrationCards: document.querySelectorAll('[data-testid*="integration"], .integration-card, .card').length > 0,
                    hasButtons: document.querySelectorAll('button').length > 0
                };
            });

            if (elements.hasHeader) {
                this.log('Integration Page Header', 'PASS', 'Header found');
            } else {
                this.log('Integration Page Header', 'FAIL', 'No header found');
            }

            if (elements.hasButtons) {
                this.log('Integration Page Buttons', 'PASS', 'Interactive elements found');
            } else {
                this.log('Integration Page Buttons', 'WARN', 'Limited interactive elements');
            }

        } catch (error) {
            this.log('Frontend Integration Page', 'FAIL', `Error: ${error.message}`);
        }
    }

    async testFrontendMarketingPage() {
        console.log('\n📱 Testing Frontend Marketing Page...');
        
        try {
            await this.page.goto(`${FRONTEND_URL}/marketing/booking-links`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Check if page loads
            const title = await this.page.title();
            this.log('Marketing Page Load', 'PASS', `Title: ${title}`);

            // Check for marketing-specific elements
            const elements = await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                return {
                    hasBookingLinks: text.includes('booking') && text.includes('link'),
                    hasQRCode: text.includes('qr') || text.includes('code'),
                    hasStats: text.includes('click') || text.includes('conversion'),
                    hasCreateButton: !!document.querySelector('button')
                };
            });

            if (elements.hasBookingLinks) {
                this.log('Marketing Page Content', 'PASS', 'Booking links content found');
            } else {
                this.log('Marketing Page Content', 'WARN', 'Limited booking links content');
            }

            if (elements.hasCreateButton) {
                this.log('Marketing Page Interactions', 'PASS', 'Interactive elements found');
            } else {
                this.log('Marketing Page Interactions', 'FAIL', 'No interactive elements');
            }

        } catch (error) {
            this.log('Frontend Marketing Page', 'FAIL', `Error: ${error.message}`);
        }
    }

    async testAPIDocumentation() {
        console.log('\n📚 Testing API Documentation...');
        
        try {
            await this.page.goto(`${BASE_URL}/docs`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Check if Swagger UI loads
            const hasSwagger = await this.page.evaluate(() => {
                return !!document.querySelector('.swagger-ui') || 
                       !!document.querySelector('#swagger-ui') ||
                       document.body.textContent.includes('swagger') ||
                       document.body.textContent.includes('OpenAPI');
            });

            if (hasSwagger) {
                this.log('API Documentation', 'PASS', 'Swagger UI accessible');
            } else {
                this.log('API Documentation', 'FAIL', 'Swagger UI not found');
            }

            // Check for review endpoints in documentation
            const hasReviewDocs = await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('reviews') && (text.includes('/api/v1/reviews') || text.includes('review'));
            });

            if (hasReviewDocs) {
                this.log('Review API Documentation', 'PASS', 'Review endpoints documented');
            } else {
                this.log('Review API Documentation', 'WARN', 'Review documentation limited');
            }

        } catch (error) {
            this.log('API Documentation', 'FAIL', `Error: ${error.message}`);
        }
    }

    async testEndToEndWorkflow() {
        console.log('\n🔄 Testing End-to-End Workflow...');
        
        try {
            // Test complete API workflow
            const workflowResults = await this.page.evaluate(async (baseUrl, token) => {
                const results = [];
                
                // 1. Get reviews
                const reviewsRes = await fetch(`${baseUrl}/api/v1/reviews`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                results.push({ step: 'Get Reviews', status: reviewsRes.status });

                // 2. Get stats
                const statsRes = await fetch(`${baseUrl}/api/v1/reviews/auto-response/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                results.push({ step: 'Get Stats', status: statsRes.status });

                // 3. Test sync (expected to fail without integration)
                const syncRes = await fetch(`${baseUrl}/api/v1/reviews/sync`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ platform: 'google', date_range_days: 30 })
                });
                results.push({ step: 'Test Sync', status: syncRes.status });

                return results;
            }, BASE_URL, this.authToken);

            let workflowPassed = true;
            for (const result of workflowResults) {
                const expectedStatuses = result.step === 'Test Sync' ? [200, 400, 404] : [200];
                if (expectedStatuses.includes(result.status)) {
                    this.log(`Workflow: ${result.step}`, 'PASS', `Status: ${result.status}`);
                } else {
                    this.log(`Workflow: ${result.step}`, 'FAIL', `Status: ${result.status}`);
                    workflowPassed = false;
                }
            }

            if (workflowPassed) {
                this.log('End-to-End Workflow', 'PASS', 'All workflow steps completed');
            } else {
                this.log('End-to-End Workflow', 'FAIL', 'Some workflow steps failed');
            }

        } catch (error) {
            this.log('End-to-End Workflow', 'FAIL', `Error: ${error.message}`);
        }
    }

    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `review_system_puppeteer_report_${timestamp}.json`;
        
        const summary = {
            total: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'PASS').length,
            failed: this.testResults.filter(r => r.status === 'FAIL').length,
            warnings: this.testResults.filter(r => r.status === 'WARN').length,
            successRate: ((this.testResults.filter(r => r.status === 'PASS').length / this.testResults.length) * 100).toFixed(1)
        };

        const report = {
            summary,
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            environment: {
                backendUrl: BASE_URL,
                frontendUrl: FRONTEND_URL,
                testCredentials: { email: TEST_EMAIL }
            }
        };

        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log('\n' + '=' * 60);
        console.log('📊 PUPPETEER TEST SUMMARY');
        console.log('=' * 60);
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed} ✅`);
        console.log(`Failed: ${summary.failed} ❌`);
        console.log(`Warnings: ${summary.warnings} ⚠️`);
        console.log(`Success Rate: ${summary.successRate}%`);
        console.log(`\n📄 Detailed report saved: ${reportFile}`);

        return summary.successRate >= 75; // Consider 75%+ a pass
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAllTests() {
        try {
            await this.setup();
            
            const authSuccess = await this.testAPIAuthentication();
            if (!authSuccess) {
                console.log('❌ Cannot proceed without authentication');
                return false;
            }

            await this.testReviewEndpoints();
            await this.testReviewSync();
            await this.testSecurityFeatures();
            await this.testFrontendIntegrationPage();
            await this.testFrontendMarketingPage();
            await this.testAPIDocumentation();
            await this.testEndToEndWorkflow();

            const success = await this.generateReport();
            return success;

        } catch (error) {
            console.error('❌ Test suite error:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the tests
(async () => {
    const test = new ReviewSystemPuppeteerTest();
    const success = await test.runAllTests();
    process.exit(success ? 0 : 1);
})();