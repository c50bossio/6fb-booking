#!/usr/bin/env node
/**
 * Simple Staging Environment Validation
 * Tests accessibility and basic functionality without browser automation
 */

const http = require('http');
const https = require('https');

class SimpleStagingValidator {
    constructor() {
        this.stagingUrls = {
            frontend: 'http://localhost:3002',
            backend: 'http://localhost:8001'
        };
        this.results = [];
    }

    async validateEnvironment() {
        console.log('🚀 Starting Simple Staging Environment Validation...\n');
        console.log(`Frontend: ${this.stagingUrls.frontend}`);
        console.log(`Backend: ${this.stagingUrls.backend}\n`);

        // Test 1: Backend Health Check
        await this.testBackendHealth();

        // Test 2: Frontend Accessibility
        await this.testFrontendAccessibility();

        // Test 3: API Endpoints
        await this.testApiEndpoints();

        // Test 4: Calendar Page Accessibility
        await this.testCalendarPage();

        this.generateReport();
    }

    async testBackendHealth() {
        console.log('🔍 Testing Backend Health...');
        
        try {
            const healthData = await this.makeRequest(`${this.stagingUrls.backend}/health`);
            console.log('   ✅ Backend health check passed');
            console.log(`   📊 Status: ${healthData?.status || 'unknown'}`);
            
            this.results.push({
                test: 'Backend Health',
                status: 'passed',
                details: healthData
            });
        } catch (error) {
            console.log(`   ❌ Backend health check failed: ${error.message}`);
            this.results.push({
                test: 'Backend Health',
                status: 'failed',
                error: error.message
            });
        }
    }

    async testFrontendAccessibility() {
        console.log('🌐 Testing Frontend Accessibility...');
        
        try {
            const response = await this.makeRequest(this.stagingUrls.frontend, { method: 'HEAD' });
            console.log('   ✅ Frontend is accessible');
            console.log(`   📄 Content-Type: ${response.contentType || 'unknown'}`);
            
            this.results.push({
                test: 'Frontend Accessibility',
                status: 'passed',
                details: { accessible: true }
            });
        } catch (error) {
            console.log(`   ❌ Frontend accessibility failed: ${error.message}`);
            this.results.push({
                test: 'Frontend Accessibility',
                status: 'failed',
                error: error.message
            });
        }
    }

    async testApiEndpoints() {
        console.log('🔌 Testing API Endpoints...');
        
        const endpoints = [
            '/docs',
            '/api/v1/auth/test',
            '/api/v1/appointments',
            '/api/v1/users/me'
        ];

        for (const endpoint of endpoints) {
            try {
                const url = `${this.stagingUrls.backend}${endpoint}`;
                const response = await this.makeRequest(url, { method: 'HEAD' });
                console.log(`   ✅ ${endpoint} - accessible`);
            } catch (error) {
                console.log(`   ⚠️ ${endpoint} - ${error.message}`);
            }
        }

        this.results.push({
            test: 'API Endpoints',
            status: 'completed',
            details: { endpointsTested: endpoints.length }
        });
    }

    async testCalendarPage() {
        console.log('📅 Testing Calendar Page...');
        
        try {
            const calendarUrl = `${this.stagingUrls.frontend}/calendar`;
            const response = await this.makeRequest(calendarUrl, { method: 'HEAD' });
            console.log('   ✅ Calendar page is accessible');
            
            this.results.push({
                test: 'Calendar Page',
                status: 'passed',
                details: { accessible: true }
            });
        } catch (error) {
            console.log(`   ❌ Calendar page failed: ${error.message}`);
            this.results.push({
                test: 'Calendar Page',
                status: 'failed',
                error: error.message
            });
        }
    }

    makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(url, {
                method: options.method || 'GET',
                timeout: 10000,
                ...options
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    if (options.method !== 'HEAD') {
                        data += chunk;
                    }
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        try {
                            const result = {
                                statusCode: res.statusCode,
                                headers: res.headers,
                                contentType: res.headers['content-type']
                            };
                            
                            if (data && options.method !== 'HEAD') {
                                try {
                                    result.data = JSON.parse(data);
                                } catch {
                                    result.data = data;
                                }
                            }
                            
                            resolve(result);
                        } catch (error) {
                            resolve({ statusCode: res.statusCode, error: error.message });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 SIMPLE STAGING VALIDATION REPORT');
        console.log('='.repeat(60));

        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'passed').length;
        const failedTests = this.results.filter(r => r.status === 'failed').length;
        const completedTests = this.results.filter(r => r.status === 'completed').length;

        console.log(`\n🎯 Test Results Summary:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests} ✅`);
        console.log(`   Failed: ${failedTests} ❌`);
        console.log(`   Completed: ${completedTests} ✅`);

        console.log(`\n📊 Test Details:`);
        this.results.forEach((result, index) => {
            const status = result.status === 'passed' ? '✅' : 
                          result.status === 'failed' ? '❌' : '✅';
            console.log(`   ${index + 1}. ${result.test}: ${status}`);
            if (result.error) {
                console.log(`      Error: ${result.error}`);
            }
        });

        console.log(`\n💡 Staging Environment Assessment:`);
        
        if (passedTests >= 3) {
            console.log(`   🎉 Staging environment is functional and ready for detailed testing`);
            console.log(`   ✅ Core services are accessible`);
            console.log(`   🚀 Ready to proceed with comprehensive app polishing`);
        } else if (passedTests >= 1) {
            console.log(`   ⚠️ Staging environment has some issues but is partially functional`);
            console.log(`   🔧 Some manual testing may be possible`);
        } else {
            console.log(`   ❌ Staging environment has significant issues`);
            console.log(`   🛠️ Infrastructure fixes needed before testing`);
        }

        console.log(`\n📍 Staging Environment URLs:`);
        console.log(`   Frontend: ${this.stagingUrls.frontend}`);
        console.log(`   Backend: ${this.stagingUrls.backend}`);
        console.log(`   API Docs: ${this.stagingUrls.backend}/docs`);

        console.log('\n' + '='.repeat(60));

        // Write report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            stagingUrls: this.stagingUrls,
            testResults: this.results,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                completed: completedTests
            }
        };

        require('fs').writeFileSync(
            '/Users/bossio/6fb-booking/backend-v2/simple-staging-validation-report.json',
            JSON.stringify(reportData, null, 2)
        );

        console.log('📄 Report saved to: simple-staging-validation-report.json\n');
    }
}

// Run validation
async function main() {
    const validator = new SimpleStagingValidator();
    await validator.validateEnvironment();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleStagingValidator;